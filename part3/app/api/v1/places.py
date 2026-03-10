from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace("places", description="Place operations")


place_model = api.model(
    "Place",
    {
        "title": fields.String(
            required=True, description="Title of the place"),
        "description": fields.String(description="Description of the place"),
        "price": fields.Float(
            required=True, description="Price per night"),
        "latitude": fields.Float(
            required=True, description="Latitude of the place"),
        "longitude": fields.Float(
            required=True, description="Longitude of the place"),
        "amenities": fields.List(
            fields.String, required=True, description="List of amenities ID's"
        ),
    },
)
place_model_response = api.inherit(
    "PlaceResponse", place_model, {
        "id": fields.String(description="Place ID"),
        "owner_id": fields.String(description="ID of the owner"),
    }
)


@api.route('/')
class PlaceList(Resource):
    @jwt_required()
    @api.doc(security='BearerAuth')
    @api.expect(place_model)
    @api.response(201, 'Place successfully created')
    @api.response(400, 'Invalid input data')
    @api.response(401, 'Missing or invalid token')
    @api.marshal_with(place_model_response)
    def post(self):
        """Register a new place"""
        place_data = api.payload
        place_data['owner_id'] = get_jwt_identity()
        try:
            return facade.create_place(place_data), 201
        except (ValueError, TypeError) as error:
            api.abort(400, error)

    @api.response(200, 'List of places retrieved successfully')
    @api.marshal_with(place_model_response, as_list=True)
    def get(self):
        """Retrieve a list of all places"""
        return facade.get_all_places()


@api.route('/<place_id>')
class PlaceResource(Resource):
    @api.response(200, 'Place details retrieved successfully')
    @api.response(404, 'Place not found')
    @api.marshal_with(place_model_response)
    def get(self, place_id):
        """Get place details by ID"""
        place_data = facade.get_place(place_id)
        if place_data:
            return place_data, 200
        api.abort(404, "Place doesn't exist")

    @jwt_required()
    @api.doc(security='BearerAuth')
    @api.expect(place_model)
    @api.response(200, 'Place updated successfully')
    @api.response(403, 'Unauthorized action')
    @api.response(404, 'Place not found')
    @api.response(400, 'Invalid input data')
    @api.response(401, 'Missing or invalid token')
    def put(self, place_id):
        """Update a place's information"""
        place_data = api.payload
        current_user_id = get_jwt_identity()

        place = facade.get_place(place_id)
        if not place:
            api.abort(404, "Place doesn't exist")

        if place.owner_id != current_user_id:
            api.abort(403, "Unauthorized action")

        try:
            facade.update_place(place_id, place_data)
            return {"message": "Place updated successfully"}, 200
        except (ValueError, TypeError) as error:
            api.abort(400, error)
