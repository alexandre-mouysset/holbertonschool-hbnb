from app.models.entity import Entity
import re


class User(Entity):
    email_regex = re.compile(
        r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
        )
    # value = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"

    def __init__(self, first_name: str, last_name: str, email: str,
                 password: str = 'a', is_admin: bool = False):
        super().__init__()
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.password = password
        self.is_admin = is_admin

    @property
    def first_name(self):
        return self._first_name

    @first_name.setter
    def first_name(self, value: str):

        if not isinstance(value, str):
            raise TypeError("first_name must be a string")

        value = value.strip()
        if not value:
            raise ValueError("first_name is required")

        if len(value) > 50:
            raise ValueError("first_name must be at most 50 characters")
        self._first_name = value

    @property
    def last_name(self):
        return self._last_name

    @last_name.setter
    def last_name(self, value: str):

        if not isinstance(value, str):
            raise TypeError("last_name must be a string")

        value = value.strip()
        if not value:
            raise ValueError("last_name is required")

        if len(value) > 50:
            raise ValueError("last_name must be at most 50 characters")
        self._last_name = value

    @property
    def email(self):
        return self._email

    @email.setter
    def email(self, value: str):
        if not isinstance(value, str):
            raise TypeError("email must be a string")

        value = value.strip()
        if not value:
            raise ValueError("email is required")

        if not self.email_regex.match(value):
            raise ValueError("email format is invalid")
        self._email = value

    @property
    def is_admin(self):
        return self._is_admin

    @is_admin.setter
    def is_admin(self, value: bool):

        if not isinstance(value, bool):
            raise TypeError("is_admin must be a boolean")
        self._is_admin = value
