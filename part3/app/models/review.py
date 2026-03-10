from app.models.entity import Entity


class Review(Entity):
    def __init__(self, text: str, rating: int, user_id: str, place_id: str):

        super().__init__()
        self.text = text
        self.rating = rating
        self.user_id = user_id
        self.place_id = place_id

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
    def place_id(self):
        return self._place_id

    @place_id.setter
    def place_id(self, value):
        self._place_id = value

    @property
    def user_id(self):
        return self._user_id

    @user_id.setter
    def user_id(self, value):
        self._user_id = value
