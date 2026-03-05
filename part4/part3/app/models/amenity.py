from app.models.entity import Entity


class Amenity(Entity):
    def __init__(self, name: str, description: str):
        super().__init__()
        self.name = name
        self.description = description

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, value: str):

        if not isinstance(value, str):
            raise TypeError("name must be a string")
        value = value.strip()

        if not value:
            raise ValueError("name is required")

        if len(value) > 50:
            raise ValueError("name must be at most 50 characters")
        self._name = value

    @property
    def description(self):
        return self._description

    @description.setter
    def description(self, value: str):

        if not isinstance(value, str):
            raise TypeError("description must be a string")
        value = value.strip()

        if len(value) > 500:
            raise ValueError("description must be at most 500 characters")
        self._description = value
