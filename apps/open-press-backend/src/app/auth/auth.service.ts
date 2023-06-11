import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtResponse } from "@open-press/backend-interfaces";
import { UserDocument, UserService } from "@open-press/models";
import { tap } from "lodash";
import { NonUniformEventList } from "strongly-typed-events";
import { AUTH_SERVICE_EVENTS } from "./constants";
import { AuthServiceEvents } from "./types";
import { AUTH_CONFIG_KEY, AuthConfig } from "@open-press/config";

@Injectable()
export class AuthService {
	private _events = new NonUniformEventList<AuthService, AuthServiceEvents>();

	constructor(
		private readonly usersService: UserService,
		private readonly jwtService: JwtService,
		@Inject(AUTH_CONFIG_KEY)
		private readonly auth_config: AuthConfig
	) {}

	/**
	 * Allows you to listen to the before validation event.
	 * @returns {IEvent<AuthService, AuthServiceEvents["hook.auth.validation.before"]>}
	 */
	get onBeforeValidation() {
		/* istanbul ignore next */
		return this._events.get(AUTH_SERVICE_EVENTS.before_validation).asEvent();
	}

	/**
	 * Allows you to listen to the validation success event.
	 * @returns {IEvent<AuthService, AuthServiceEvents["hook.auth.validation.success"]>}
	 */
	get onValidationSuccess() {
		/* istanbul ignore next */
		return this._events.get(AUTH_SERVICE_EVENTS.validation_success).asEvent();
	}

	/**
	 * Allows you to listen to the validation failed event.
	 * @returns {IEvent<AuthService, AuthServiceEvents["hook.auth.validation.failed"]>}
	 */
	get onValidationFailed() {
		/* istanbul ignore next */
		return this._events.get(AUTH_SERVICE_EVENTS.validation_failed).asEvent();
	}

	/**
	 * Allows you to listen to the login event.
	 * @returns {IEvent<AuthService, AuthServiceEvents["hook.auth.user.logged_in"]>}
	 */
	get onUserLoggedIn() {
		/* istanbul ignore next */
		return this._events.get(AUTH_SERVICE_EVENTS.user_logged_in).asEvent();
	}

	/**
	 * This method validates the user's credentials.
	 * @param {string} email The user's email.
	 * @param {string} password The user's password.
	 * @returns {Promise<null | UserDocument>}
	 */
	async validate(email: string, password: string): Promise<null | UserDocument> {
		this._events.get(AUTH_SERVICE_EVENTS.before_validation).dispatch(this, {
			email,
			password,
		});

		try {
			return tap(await this.usersService.findByEmailAndPassword(email, password), (user) => {
				this._events.get(AUTH_SERVICE_EVENTS.validation_success).dispatch(this, { user });
			});
		} catch (error) {
			// if the user is not found, fallback to returning null as the strategy will appropriately handle it
			this._events.get(AUTH_SERVICE_EVENTS.validation_failed).dispatch(this, { error });
		}

		return null;
	}

	/**
	 * This method generates a JWT token for the user.
	 * @param {UserDocument} user The user document.
	 * @param remember_me
	 * @returns {Promise<{access_token: string}>} The JWT token.
	 */
	async login(user: UserDocument, remember_me: boolean) {
		return tap(
			{
				access_token: this.jwtService.sign(
					{},
					{
						subject: user.id,
						expiresIn: !remember_me ? this.auth_config.jwt.expires_in : "30 days",
					}
				),
			} as JwtResponse,
			(jwt) => {
				this._events.get(AUTH_SERVICE_EVENTS.user_logged_in).dispatch(this, { jwt });
			}
		);
	}
}
