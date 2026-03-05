from app.models.entity import Entity
from app.models.place import Place
from app.models.user import User


class Review(Entity):
    def __init__(self, text: str, rating: int, user: User, place: Place):

        super().__init__()
        self.text = text
        self.rating = rating
        self.user = user
        self.place = place

    @property
    def text(self):
        return self._text

    @text.setter
    def text(self, value: str):

        if not isinstance(value, str):
            raise TypeError("text must be a string")
        value = value.strip()

        if not value:
            raise ValueError("text is required")
        self._text = value

    @property
    def comment(self):
        return self._text

    @comment.setter
    def comment(self, value: str):
        self.text = value

    @property
    def rating(self):
        return self._rating

    @rating.setter
    def rating(self, value: int):

        if not isinstance(value, int):
            raise TypeError("rating must be an integer")

        if value < 1 or value > 5:
            raise ValueError("rating must be between 1 and 5")
        self._rating = value

    @property
    def place(self):
        return self._place

    @place.setter
    def place(self, value):

        if not isinstance(value, Place):
            raise TypeError("place must be a Place instance")

        if not getattr(value, "id", None):
            raise ValueError("place must exist and have a valid id")
        self._place = value

    @property
    def user(self):
        return self._user

    @user.setter
    def user(self, value):

        if not isinstance(value, User):
            raise TypeError("user must be a User instance")

        if not getattr(value, "id", None):
            raise ValueError("user must exist and have a valid id")
        self._user = value
