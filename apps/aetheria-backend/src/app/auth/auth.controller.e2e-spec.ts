import { DATABASE_CONNECTIONS } from "@aetheria/config";
import { UserService } from "@aetheria/models";
import { faker } from "@faker-js/faker";
import { INestApplication } from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import axios from "axios";
import { Connection } from "mongoose";
import { AppModule } from "../app.module";
import { AuthController } from "./auth.controller";
import { LocalStrategy } from "./strategies";

describe("AuthController", () => {
	let app: INestApplication,
		local_strategy: LocalStrategy,
		user_service: UserService,
		url: string,
		module: TestingModule,
		connection: Connection;

	const makeUser = (email: string, password: string) => {
		return user_service.create({
			email,
			password,
			name: faker.person.fullName(),
		});
	};

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		local_strategy = module.get<LocalStrategy>(LocalStrategy);
		user_service = module.get<UserService>(UserService);

		app = module.createNestApplication();
		await app.listen(3000);
		url = await app.getUrl();
	});

	beforeEach(async () => {
		connection = module.get<Connection>(getConnectionToken(DATABASE_CONNECTIONS.default));
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
});
