import datetime

from pydantic import BaseModel


class SiteSchema(BaseModel):
    id: int
    slug: str
    domain: str | None
    title: str | None

    model_config = {"from_attributes": True}


class TopSiteSchema(BaseModel):
    site: SiteSchema
    visits: int | None

    model_config = {"from_attributes": True}
