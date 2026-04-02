from sqlalchemy.orm import validates
from app.models.place import place_amenity
from app import db
from app.models.baseclass import BaseModel


class Amenity(BaseModel):
    __tablename__ = "amenities"

    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(500), nullable=True, default="")
    places = db.relationship(
        "Place",
        secondary=place_amenity,
        back_populates="amenities",
        lazy="dynamic"
    )

    @validates("name")
    def validate_name(self, _, value):
        return value.strip()

    @validates("description")
    def validate_description(self, _, value):
        if value is None:
            return ""
        return value.strip()
