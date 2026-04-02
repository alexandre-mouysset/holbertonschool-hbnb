from sqlalchemy.orm import validates

from app import db
from app.models.baseclass import BaseModel


class Review(BaseModel):
    __tablename__ = "reviews"

    text = db.Column(db.String(500), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.String(36),
                        db.ForeignKey("users.id"),
                        nullable=False)
    place_id = db.Column(db.String(36),
                         db.ForeignKey("places.id"),
                         nullable=False)
    place = db.relationship("Place", back_populates="reviews")
    user = db.relationship("User", back_populates="reviews")

    @validates("text")
    def validate_text(self, _, value):
        return value.strip()

    @validates("rating")
    def validate_rating(self, _, value):
        if value < 1 or value > 5:
            raise ValueError("rating must be between 1 and 5")
        return value
