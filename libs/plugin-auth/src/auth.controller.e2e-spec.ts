import { bootstrap, UserService } from "@aetheria/common";
import { DATABASE_CONNECTIONS } from "@aetheria/config";
import { faker } from "@faker-js/faker";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { getConnectionToken } from "@nestjs/mongoose";
import axios from "axios";
import { Connection } from "mongoose";

describe("AuthController", () => {
	let app: INestApplication, user_service: UserService, jwt_service: JwtService, url: string, connection: Connection;

	const makeUser = (email: string, password: string) => {
		return user_service.create({
			email,
			password,
			name: faker.person.fullName(),
		});
	};

	beforeAll(async () => {
		app = (await bootstrap({
			enable_native_logging: false,
			enable_error_logging: false,
		})) as INestApplication;

		url = await app.getUrl();

		user_service = app.get<UserService>(UserService);
		jwt_service = app.get<JwtService>(JwtService);
	});

	beforeEach(async () => {
		connection = app.get<Connection>(getConnectionToken(DATABASE_CONNECTIONS.default));
		await connection.dropDatabase();
	});

	afterAll(async () => {
		await app.close();
	});

	it("should fire local strategy hooks when logging in", async () => {
		await makeUser("test@example.com", "password");

		const res = await axios.post(
			`/auth/login`,
			{
				email: "test@example.com",
				password: "password",
				remember_me: false,
			},
			{
				baseURL: url,
			}
		);

		expect(res.status).toBe(201);
	});

	it("should return valid access token on login", async () => {
		await makeUser("test@example.com", "password");

		const res = await axios.post(
			`/auth/login`,
			{
				email: "test@example.com",
				password: "password",
				remember_me: false,
			},
			{
				baseURL: url,
			}
		);

		expect(res.status).toBe(201);
		expect(res.data.access_token).toBeDefined();
	});

	it("should be unauthorized with wrong credentials", async () => {
		try {
			await axios.post(
				`/auth/login`,
				{
					email: "test@example.com",
					password: "password",
					remember_me: false,
				},
				{
					baseURL: url,
				}
			);
		} catch (e: any) {
			expect(e.response.status).toBe(401);
		}
	});

	it("should be able to get the user profile", async () => {
		await makeUser("test@example.com", "password");

		const login_response = await axios.post(
			`/auth/login`,
			{
				email: "test@example.com",
				password: "password",
				remember_me: false,
			},
			{
				baseURL: url,
			}
		);

		const res = await axios.get(`/auth/profile`, {
			baseURL: url,
			headers: {
				Authorization: `Bearer ${login_response.data.access_token}`,
			},
		});

		expect(res.status).toBe(200);
		expect(res.data.id).toBeDefined();
		expect(res.data.name).toBeDefined();
		expect(res.data.email).toBeDefined();

		expect(res.data.email).toEqual("test@example.com");
	});

	it("can revalidate if authenticated", async () => {
		await makeUser("test@example.com", "password");

		const login_response = await axios.post(
			`/auth/login`,
			{
				email: "test@example.com",
				password: "password",
				remember_me: false,
			},
			{
				baseURL: url,
			}
		);

		const res = await axios.get(`/auth/revalidate`, {
			baseURL: url,
			headers: {
				Authorization: `Bearer ${login_response.data.access_token}`,
			},
		});

		expect(res.status).toBe(200);
		expect(res.data.can_revalidate).toBeTruthy();
	});

	it("fails if malformed jwt is used", async () => {
		await makeUser("test@example.com", "password");

		const bearer = jwt_service.sign({});

		try {
			await axios.get(`/auth/profile`, {
				baseURL: url,
				headers: {
					Authorization: `Bearer ${bearer}`,
				},
			});
		} catch (e: any) {
			expect(e.response.status).toBe(401);
		}
	});
});
