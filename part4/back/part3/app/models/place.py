from sqlalchemy.orm import validates

from app import db
from app.models.baseclass import BaseModel


place_amenity = db.Table(
    "place_amenity",
    db.Column("place_id", db.String(36),
              db.ForeignKey("places.id"),
              primary_key=True),
    db.Column("amenity_id", db.String(36),
              db.ForeignKey("amenities.id"),
              primary_key=True)
)


class Place(BaseModel):
    __tablename__ = "places"

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    price = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    user_id = db.Column(db.String(36),
                        db.ForeignKey("users.id"),
                        nullable=False)
    amenities = db.relationship(
        "Amenity",
        secondary=place_amenity,  # passe par la table intermédiaire
        back_populates="places",
        lazy="dynamic"
    )
    owner = db.relationship("User", back_populates="places")
    reviews = db.relationship("Review", back_populates="place", lazy="dynamic")

    def add_review(self, review):
        self.reviews.append(review)

    def add_amenity(self, amenity):
        self.amenities.append(amenity)

    @validates("title")
    def validate_title(self, _, value):
        return value.strip()

    @validates("price")
    def validate_price(self, _, value):
        if isinstance(value, str):
            value = value.strip()
            try:
                value = float(value)
            except ValueError:
                raise TypeError("price must be a positive float")
        elif isinstance(value, (int, float)):
            value = float(value)
        else:
            raise TypeError("price must be a positive float")

        if value <= 0:
            raise ValueError("price must be a positive value")
        return value

    @validates("latitude")
    def validate_latitude(self, _, value):
        if not isinstance(value, (int, float)):
            raise TypeError("latitude must be a float")

        value = float(value)

        if value < -90.0 or value > 90.0:
            raise ValueError("latitude must be between -90.0 and 90.0")
        return value

    @validates("longitude")
    def validate_longitude(self, _, value):
        if not isinstance(value, (int, float)):
            raise TypeError("longitude must be a float")

        value = float(value)

        if value < -180.0 or value > 180.0:
            raise ValueError("longitude must be between -180.0 and 180.0")
        return value
