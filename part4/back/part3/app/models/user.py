import re

from sqlalchemy.orm import validates

from app import bcrypt, db
from app.models.baseclass import BaseModel

email_format = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"


class User(BaseModel):
    __tablename__ = "users"

    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    places = db.relationship("Place", back_populates="owner", lazy="dynamic")
    reviews = db.relationship("Review", back_populates="user",
                              lazy="dynamic")

    @validates("email")
    def validate_email(self, _, value):
        if not re.match(email_format, value):
            raise ValueError("email format is invalid")
        return value

    @validates("password")
    def hash_password(self, _, value):
        """Hash the password before storing it."""
        return bcrypt.generate_password_hash(value).decode("utf-8")

    def verify_password(self, password):
        """Verify the hashed password."""
        return bcrypt.check_password_hash(self.password, password)
