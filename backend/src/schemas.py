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


class SiteMetricSchema(BaseModel):
    date: datetime.date
    weekday: str
    visits: int | None
    visits_diff: int | None


class SiteAnalyticsSchema(BaseModel):
    visits_today: int | None
    change_pct: float | None
    rank_today: int | None
    best_weekday: str | None


class SiteMetricsResponseSchema(BaseModel):
    analytics: SiteAnalyticsSchema
    metrics: list[SiteMetricSchema]
