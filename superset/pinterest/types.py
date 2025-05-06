from typing import Literal, TypedDict


class PinterestMenuItems(TypedDict):
    name: str
    href: str
    icon: str


class PinterestWelcomeTopSections(TypedDict):
    name: str
    tag: str


class DatabaseTableMetadataField(TypedDict):
    key: str
    value: str
    type: Literal["string", "sql"]
