from app.models.amenity import Amenity
from app.models.place import Place
from app.models.review import Review
from app.models.user import User
from app.persistence.repository import InMemoryRepository


class HBnBFacade:
    def __init__(self):
        self.user_repo = InMemoryRepository()
        self.place_repo = InMemoryRepository()
        self.review_repo = InMemoryRepository()
        self.amenity_repo = InMemoryRepository()

# ----- user ----------------------------------

    def create_user(self, user_data):
        user = User(**user_data)
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email):
        return self.user_repo.get_by_attribute("email", email)

    def get_all_user(self):
        return self.user_repo.get_all()

    def update_user(self, id, data):
        self.user_repo.update(id, data)
        return self.user_repo.get(id)

# ----- amenity -------------------------------

    def create_amenity(self, amenity_data):
        if not amenity_data.get("description"):
            amenity_data["description"] = ""
        amenity = Amenity(**amenity_data)
        self.amenity_repo.add(amenity)
        return amenity

    def get_amenity(self, amenity_id):
        return self.amenity_repo.get(amenity_id)

    def get_all_amenities(self):
        return self.amenity_repo.get_all()

    def update_amenity(self, amenity_id, amenity_data):
        self.amenity_repo.update(amenity_id, amenity_data)
        return self.amenity_repo.get(amenity_id)

# ----- place ---------------------------------

    def create_place(self, place_data):
        amenities = place_data.pop("amenities")
        owner = self.user_repo.get(place_data.get("owner_id"))
        if owner is None:
            raise ValueError("owner id is not a valid id")

        place = Place(**place_data)

        for amenity in amenities:
            if not self.amenity_repo.get(amenity):
                raise ValueError("amenities id is not a valid id")
            place.add_amenity(amenity)

        self.place_repo.add(place)
        return place

    def get_place(self, place_id):
        return self.place_repo.get(place_id)

    def get_all_places(self):
        return self.place_repo.get_all()

    def update_place(self, place_id, place_data):
        self.place_repo.update(place_id, place_data)
        return self.place_repo.get(place_id)

# ----- Review --------------------------------

    def create_review(self, review_data):
        user_id = review_data.get("user_id")
        place_id = review_data.get("place_id")
        text = review_data.get("text")
        rating = review_data.get("rating")

        if not isinstance(text, str) or not text.strip():
            raise ValueError("text is required")

        if rating is None:
            raise ValueError("rating is required")

        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError("User not found")

        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")

        review = Review(
            text=text,
            rating=rating,
            user=user,
            place=place,
        )
        self.review_repo.add(review)
        return review

    def get_review(self, review_id):
        return self.review_repo.get(review_id)

    def get_all_reviews(self):
        return self.review_repo.get_all()

    def get_reviews_by_place(self, place_id):
        return [
            review
            for review in self.review_repo.get_all()
            if review.place.id == place_id
        ]

    def update_review(self, review_id, review_data):
        review = self.review_repo.get(review_id)
        if not review:
            return None

        blocked_fields = {"id", "user", "user_id", "place", "place_id"}
        safe_data = {
            key: value
            for key, value in review_data.items()
            if key not in blocked_fields
        }
        self.review_repo.update(review_id, safe_data)
        return self.review_repo.get(review_id)

    def delete_review(self, review_id):
        self.review_repo.delete(review_id)
