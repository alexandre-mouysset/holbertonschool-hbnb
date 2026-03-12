from flask_jwt_extended import create_access_token
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services import facade

api = Namespace("auth", description="Authentication operations")

user_model = api.model(
    "UserModel",
    {
        "email": fields.String(required=True, description="Email of the user"),
        "password": fields.String(required=True,
                                  description="Password of the user"),
    },
    strict=True,
)


@api.route("/")
class UserList(Resource):
    @api.response(401, "Invalid credentials")
    @api.response(200, "Token returned successfully")
    @api.expect(user_model, validate=True)
    def post(self):
        """Authenticate user and return a JWT token"""
        credentials = api.payload

        user = facade.get_user_by_email(credentials["email"])

        if not user or not user.verify_password(credentials["password"]):
            return {"error": "Invalid credentials"}, 401

        access_token = create_access_token(
            identity=str(user.id), additional_claims={
                "is_admin": user.is_admin
                }
        )

        return {"access_token": access_token}, 200


@api.route("/protected")
@api.doc(security='BearerAuth')
class ProtectedResource(Resource):
    @jwt_required()
    def get(self):
        """A protected endpoint that requires a valid JWT token"""
        user_id = get_jwt_identity()
        user = facade.get_user(user_id)
        if not user:
            return {"message": "invalide token"}
        return {
            "id": {user.id},
            "is_admin": {user.is_admin}
        }, 200
