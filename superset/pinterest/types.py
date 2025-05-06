from typing import TypedDict, Literal


class PinterestMenuItems(TypedDict):
    name: str
    href: str
    icon: str

class PinterestWelcomeTopSections(TypedDict):
    name: str
    tag: str

class DatabaseTableMetadataFields(TypedDict):
    key: str
    value: str
    type: Literal["string", "sql"]
