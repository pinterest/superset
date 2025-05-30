from flask_babel import lazy_gettext as _

from superset.commands.exceptions import CommandException

class DatasetGetTableMetadataError(CommandException):
    message = _("Error getting dataset table metadata.")
