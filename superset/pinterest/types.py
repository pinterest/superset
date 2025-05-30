from typing import Literal, Optional, TypedDict


class PinterestMenuItems(TypedDict):
    name: str
    href: str
    icon: str


class PinterestWelcomeTopSections(TypedDict):
    name: str
    tag: str


class TableMetadataField(TypedDict):
    key: str
    value: str
    type: Literal["string", "sql"]

class TableMetadata(TypedDict):
    table_name: str
    metadata_fields: Optional[list[TableMetadataField]]

class DatasetTableMetadata(TypedDict):
    database_name: str
    table_metadata: list[TableMetadata]