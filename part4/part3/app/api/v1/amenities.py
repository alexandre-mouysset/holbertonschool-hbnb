from flask_restx import Namespace, Resource, fields

from app.services import facade

api = Namespace("amenities", description="Amenities operations")

amenity_model = api.model(
    "AmenityModel",
    {
        "name": fields.String(
            required=True, description="Name of the amenity"),
        "description": fields.String(
            required=False, description="Description of the amenity"
        ),
    },
    strict=True,
)

amenity_model_response = api.inherit(
    "AmenityResponse", amenity_model,
    {"id": fields.String(description="Amenity ID")}
)


@api.route("/")
class AmenityList(Resource):
    @api.marshal_with(amenity_model_response, as_list=True)
    def get(self):
        """Retrieve all amenities"""
        return facade.get_all_amenities(), 200

    @api.response(400, "Invalid input data")
    @api.response(201, "Amenity created successfully")
    @api.expect(amenity_model, validate=True)
    @api.marshal_with(amenity_model_response)
    def post(self):
        """Create a new amenity"""
        amenity_data = api.payload
        try:
            return facade.create_amenity(amenity_data), 201
        except ValueError as error:
            api.abort(400, error)


@api.route("/<amenity_id>")
@api.response(404, "Amenity doesn't exist")
class AmenityResource(Resource):
    @api.response(200, "Amenity returned correctly")
    @api.marshal_with(amenity_model_response)
    def get(self, amenity_id):
        """Get amenity details by ID"""
        amenity_data = facade.get_amenity(amenity_id)
        if amenity_data:
            return amenity_data, 200
        api.abort(404, "Amenity doesn't exist")

    @api.response(400, "Invalid input data")
    @api.response(200, "Amenity updated correctly")
    @api.expect(amenity_model, validate=True)
    def put(self, amenity_id):
        """Update amenity information"""
        amenity_data = api.payload

        if not facade.get_amenity(amenity_id):
            api.abort(404, "Amenity doesn't exist")
        try:
            facade.update_amenity(amenity_id, amenity_data)
            return {"message": "Amenity updated successfully"}, 200
        except ValueError as error:
            api.abort(400, error)
