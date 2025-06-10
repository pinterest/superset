from typing import Optional, TypedDict


class PinterestMenuItems(TypedDict):
    name: str
    href: str
    icon: str


class PinterestWelcomeTopSections(TypedDict):
    name: str
    tag: str


class PinterestCustomLink(TypedDict):
    name: str
    href: str
    icon: Optional[str]
    category: Optional[str]
    category_icon: Optional[str]
    icon: Optional[str]
