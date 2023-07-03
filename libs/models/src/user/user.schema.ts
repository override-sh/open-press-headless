import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DateTime } from "luxon";
import { HydratedDocument, Model } from "mongoose";

@Schema()
export class User {
	/**
	 * User's name.
	 * @type {string}
	 */
	@Prop({
		required: true,
		maxlength: 255,
	})
	name!: string;

	/**
	 * User's email.
	 * @type {string}
	 */
	@Prop({
		required: true,
		maxlength: 255,
		unique: true,
	})
	email!: string;

	/**
	 * User's password.
	 * @type {string}
	 */
	@Prop({ required: true })
	password!: string;

	/**
	 * User's creation date - autofilled when using UserService.
	 * @type {DateTime}
	 */
	@Prop({
		required: true,
		default: DateTime.now(),
		type: DateTime,
	})
	created_at!: DateTime;

	/**
	 * User's last update date - autofilled when using UserService.
	 * @type {DateTime}
	 */
	@Prop({
		required: true,
		default: DateTime.now(),
		type: DateTime,
	})
	updated_at!: DateTime;
}

export const UserSchema = SchemaFactory.createForClass(User);

/**
 * Type for a hydrated User document, returned in queries.
 */
export type UserDocument = HydratedDocument<User>;

/**
 * Type for a User mongoose model, this type is not returned in query - you should use UserDocument instead.
 */
export type UserModel = Model<User>;