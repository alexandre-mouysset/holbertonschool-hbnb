from flask_restx import Namespace, Resource, fields

from app.services import facade

api = Namespace("reviews", description="Review operations")

review_model = api.model(
    "ReviewModel",
    {
        "text": fields.String(required=True, description="Text of the review"),
        "rating": fields.Integer(
            required=True, description="Rating value between 1 and 5"
        ),
        "user_id": fields.String(
            required=True, description="ID of the user who wrote the review"
        ),
        "place_id": fields.String(
            required=True, description="ID of the reviewed place"
        ),
    },
    strict=True,
)

review_update_model = api.model(
    "ReviewUpdateModel",
    {
        "text": fields.String(required=True, description="Updated text"),
        "rating": fields.Integer(required=True, description="Updated rating"),
    },
    strict=True,
)

review_model_response = api.model(
    "ReviewResponse",
    {
        "id": fields.String(description="Review ID"),
        "text": fields.String(description="Text of the review"),
        "rating": fields.Integer(description="Rating value"),
        "user_id": fields.String(attribute="user.id", description="User ID"),
        "place_id": fields.String(
            attribute="place.id", description="Place ID"),
    },
)


@api.route("/")
class ReviewList(Resource):
    @api.marshal_with(review_model_response, as_list=True)
    def get(self):
        """Retrieve all reviews"""
        return facade.get_all_reviews(), 200

    @api.response(400, "Invalid input data")
    @api.response(201, "Review created successfully")
    @api.expect(review_model, validate=True)
    @api.marshal_with(review_model_response)
    def post(self):
        """Create a new review"""
        review_data = api.payload
        try:
            return facade.create_review(review_data), 201
        except (TypeError, ValueError) as error:
            api.abort(400, str(error))


@api.route("/<review_id>")
@api.response(404, "Review doesn't exist")
class ReviewResource(Resource):
    @api.response(200, "Review returned correctly")
    @api.marshal_with(review_model_response)
    def get(self, review_id):
        """Get review details by ID"""
        review_data = facade.get_review(review_id)
        if review_data:
            return review_data, 200
        api.abort(404, "Review doesn't exist")

    @api.response(400, "Invalid input data")
    @api.response(200, "Review updated correctly")
    @api.expect(review_update_model, validate=True)
    @api.marshal_with(review_model_response)
    def put(self, review_id):
        """Update review text and rating"""
        review_data = api.payload

        if not facade.get_review(review_id):
            api.abort(404, "Review doesn't exist")
        try:
            return facade.update_review(review_id, review_data), 200
        except (TypeError, ValueError) as error:
            api.abort(400, str(error))

    @api.response(200, "Review deleted correctly")
    def delete(self, review_id):
        """Delete a review by ID"""
        if not facade.get_review(review_id):
            api.abort(404, "Review doesn't exist")
        facade.delete_review(review_id)
        return {"message": "Review deleted successfully"}, 200


@api.route("/by_place/<place_id>")
class ReviewByPlace(Resource):
    @api.response(200, "Reviews returned correctly")
    @api.marshal_with(review_model_response, as_list=True)
    def get(self, place_id):
        """Retrieve all reviews for a specific place"""
        return facade.get_reviews_by_place(place_id), 200
