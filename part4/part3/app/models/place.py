from app.models.entity import Entity


class Place(Entity):
    def __init__(
        self,
        title: str,
        description: str,
        price: float,
        latitude: float,
        longitude: float,
        owner_id: str,
    ):
        super().__init__()
        self.title = title
        self.description = description
        self.price = price
        self.latitude = latitude
        self.longitude = longitude
        self.owner_id = owner_id
        self.reviews = []  # List to store related reviews
        self.amenities = []  # List to store related amenities

    def add_review(self, review):
        """Add a review to the place."""
        self.reviews.append(review)

    def add_amenity(self, amenity: str):
        """Add an amenity to the place."""
        self.amenities.append(amenity)

    @property
    def title(self):
        return self._title

    @title.setter
    def title(self, value: str):

        if not isinstance(value, str):
            raise TypeError("title must be a string")

        value = value.strip()
        if not value:
            raise ValueError("title is required")

        if len(value) > 100:
            raise ValueError("title must be at most 100 characters")
        self._title = value

    @property
    def description(self):
        return self._description

    @description.setter
    def description(self, value):

        if value is None:
            self._description = None
            return

        if not isinstance(value, str):
            raise TypeError("description must be a string or None")
        self._description = value

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):

        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("price is required")
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
        self._price = value

    @property
    def latitude(self):
        return self._latitude

    @latitude.setter
    def latitude(self, value):
        if not isinstance(value, (int, float)):
            raise TypeError("latitude must be a float")

        value = float(value)

        if value < -90.0 or value > 90.0:
            raise ValueError("latitude must be between -90.0 and 90.0")
        self._latitude = value

    @property
    def longitude(self):
        return self._longitude

    @longitude.setter
    def longitude(self, value):

        if not isinstance(value, (int, float)):
            raise TypeError("longitude must be a float")

        value = float(value)

        if value < -180.0 or value > 180.0:
            raise ValueError("longitude must be between -180.0 and 180.0")
        self._longitude = value

    @property
    def owner_id(self):
        return self._owner_id

    @owner_id.setter
    def owner_id(self, value):
        if not isinstance(value, str):
            raise TypeError("owner_id must be a User id")
        self._owner_id = value
