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
        "owner_id": fields.String(
            required=True, description="ID of the owner"),
        "amenities": fields.List(
            fields.String, required=True, description="List of amenities ID's"
        ),
    },
)
place_model_response = api.inherit(
    "PlaceResponse", place_model, {"id": fields.String(description="Place ID")}
)


@api.route('/')
class PlaceList(Resource):
    @api.expect(place_model)
    @api.response(201, 'Place successfully created')
    @api.response(400, 'Invalid input data')
    @api.marshal_with(place_model_response)
    def post(self):
        """Register a new place"""
        place_data = api.payload
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

    @api.expect(place_model)
    @api.response(200, 'Place updated successfully')
    @api.response(404, 'Place not found')
    @api.response(400, 'Invalid input data')
    def put(self, place_id):
        """Update a place's information"""
        place_data = api.payload

        if not facade.get_place(place_id):
            api.abort(404, "Place doesn't exist")

        try:
            facade.update_place(place_id, place_data)
            return {"message": "Place updated successfully"}, 200
        except (ValueError, TypeError) as error:
            api.abort(400, error)
