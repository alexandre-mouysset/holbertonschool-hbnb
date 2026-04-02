import os

from flask import Flask, abort, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_restx import Api
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
bcrypt = Bcrypt()
jwt = JWTManager()

db = SQLAlchemy()


def create_app(config_class="config.DevelopmentConfig"):
    from app.models.amenity import Amenity  # noqa: F401
    from app.models.place import Place  # noqa: F401
    from app.models.review import Review  # noqa: F401
    from app.models.user import User  # noqa: F401

    from app.api.v1.users import api as users_ns
    from app.api.v1.amenities import api as amenities_ns
    from app.api.v1.places import api as place_ns
    from app.api.v1.reviews import api as reviews_ns
    from app.api.v1.auth import api as auth_ns

    project_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..")
    )
    frontend_dir = os.path.join(project_root, "front", "base_files")

    app = Flask(__name__, static_folder=frontend_dir, static_url_path="")
    CORS(app)
    app.config.from_object(config_class)
    bcrypt.init_app(app)
    jwt.init_app(app)
    db.init_app(app)

    with app.app_context():
        db.create_all()

    authorizations = {
        'BearerAuth': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization',
            'description': 'JWT token: Bearer <token>'
        }
    }

    api = Api(
        app,
        version="1.0",
        title="HBnB API",
        description="HBnB Application API",
        doc="/api",
        authorizations=authorizations,
        security='BearerAuth'
    )

    api.add_namespace(users_ns, path="/api/v1/users")
    api.add_namespace(amenities_ns, path="/api/v1/amenities")
    api.add_namespace(place_ns, path="/api/v1/places")
    api.add_namespace(reviews_ns, path="/api/v1/reviews")
    api.add_namespace(auth_ns, path="/api/v1/auth")

    @app.get("/")
    def serve_index():
        return app.send_static_file("index.html")

    # Flask-RESTX also registers '/' as endpoint 'root';
    # force it to serve frontend homepage.
    if "root" in app.view_functions:
        app.view_functions["root"] = serve_index

    @app.get("/<path:asset_path>")
    def serve_front_asset(asset_path):
        if asset_path.startswith("api/"):
            abort(404)

        full_path = os.path.join(frontend_dir, asset_path)
        if os.path.isfile(full_path):
            return send_from_directory(frontend_dir, asset_path)

        abort(404)

    return app
