from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource, fields

from app.services import facade

api = Namespace("users", description="User operations")

user_model = api.model(
    "UserModel",
    {
        "first_name": fields.String(
            required=True, description="First name of the user"
        ),
        "last_name": fields.String(required=True, description="Last name of the user"),
        "email": fields.String(required=True, description="Email of the user"),
    },
    strict=True,
)

user_model_response = api.inherit(
    "UserResponse", user_model, {"id": fields.String(description="User ID")}
)

user_model_register = api.model(
    "UserRegister",
    {**user_model, "password": fields.String(required=True)},
    strict=True,
)

user_model_update = api.model(
    "UserUpdate",
    {
        "first_name": fields.String(
            required=True, description="First name of the user"
        ),
        "last_name": fields.String(required=True, description="Last name of the user"),
    },
    strict=True,
)

user_model_admin_update = api.model(
    "UserAdminUpdate",
    {
        "first_name": fields.String(description="First name of the user"),
        "last_name": fields.String(description="Last name of the user"),
        "email": fields.String(description="Email of the user"),
        "password": fields.String(description="Password of the user"),
    },
)


@api.route("/")
class UserList(Resource):
    @api.marshal_with(user_model_response, as_list=True)
    def get(self):
        """Retrieve all users"""
        return facade.get_all_user(), 200

    @api.doc(security="BearerAuth")
    @api.response(400, "Invalid input data")
    @api.response(201, "Account created successfully")
    @api.response(401, "Missing or invalid token")
    @api.response(403, "Admin privileges required")
    @api.expect(user_model_register, validate=True)
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

    @jwt_required()
    @api.doc(security="BearerAuth")
    @api.expect(user_model_admin_update, validate=True)
    @api.response(200, "User updated correctly")
    @api.response(400, "Invalid input data")
    @api.response(401, "Missing or invalid token")
    @api.response(403, "Unauthorized action")
    @api.marshal_with(user_model_response)
    def put(self, user_id):
        """Update user information (admin: all fields; user: own profile,
        no email/password)"""
        user_data = api.payload
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        if not facade.get_user(user_id):
            api.abort(404, "User doesn't exist")

        if not is_admin:
            if current_user_id != user_id:
                api.abort(403, "Unauthorized action")
            if "email" in user_data or "password" in user_data:
                api.abort(403, "Unauthorized action")

        if "email" in user_data:
            existing = facade.get_user_by_email(user_data["email"])
            if existing and existing.id != user_id:
                api.abort(400, "Email already registered")

        try:
            return facade.update_user(user_id, user_data), 200
        except ValueError as error:
            api.abort(400, error)
