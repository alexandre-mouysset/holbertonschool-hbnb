from flask_restx import Namespace, Resource, fields

from app.services import facade

api = Namespace("users", description="User operations")

user_model = api.model(
    "UserModel",
    {
        "first_name": fields.String(
            required=True, description="First name of the user"
        ),
        "last_name": fields.String(
            required=True, description="Last name of the user"
        ),
        "email": fields.String(
            required=True, description="Email of the user"
        ),
    },
    strict=True,
)

user_model_response = api.inherit(
    "UserResponse", user_model, {"id": fields.String(description="User ID")}
)


@api.route("/")
class UserList(Resource):
    @api.marshal_with(user_model_response, as_list=True)
    def get(self):
        """Retrieve all users"""
        return facade.get_all_user(), 200

    @api.response(400, "Invalid input data")
    @api.response(201, "Account created successfully")
    @api.expect(user_model, validate=True)
    @api.marshal_with(user_model_response)
    def post(self):
        """Create a new user"""
        user_data = api.payload
        if facade.get_user_by_email(user_data["email"]):
            api.abort(400, "Email already registered")
        try:
            return facade.create_user(user_data), 201
        except ValueError as error:
            api.abort(400, error)


@api.route("/<user_id>")
@api.response(404, "User doesn't exist")
class UserResource(Resource):
    @api.response(200, "User returned correctly")
    @api.marshal_with(user_model_response)
    def get(self, user_id):
        """Get user details by ID"""
        user_data = facade.get_user(user_id)
        if user_data:
            return user_data, 200
        api.abort(404, "User doesn't exist")

    @api.response(400, "Invalid input data")
    @api.response(409, "Email already registered")
    @api.response(200, "User updated correctly")
    @api.expect(user_model, validate=True)
    @api.marshal_with(user_model_response)
    def put(self, user_id):
        """Update user information with email conflict checking"""
        user_data = api.payload

        if not facade.get_user(user_id):
            api.abort(404, "User doesn't exist")

        user_with_email = facade.get_user_by_email(user_data["email"])
        if user_with_email and user_with_email.id != user_id:
            api.abort(409, "Email already registered")
        try:
            return facade.update_user(user_id, user_data), 200
        except ValueError as error:
            api.abort(400, error)
