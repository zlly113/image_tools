from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

# --- Site Config Schemas ---
class SiteConfigItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SiteConfigUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class PublicSiteConfig(BaseModel):
    site_name: str = "超级工具箱 Pro"
    site_version: str = "2.0.0"
    announcement: str = ""
    announcement_i18n: Dict[str, str] = Field(default_factory=dict)
    announcement_active: bool = False
    maintenance_mode: bool = False
    default_locale: str = "zh-CN"
    available_locales: List[str] = Field(default_factory=lambda: ["zh-CN", "en-US"])
    ocr_modelscope_repo: str = ""
    features: Dict[str, bool] = Field(default_factory=lambda: {
        "ocr_enabled": True,
        "shortlink_enabled": True,
        "ai_tools_enabled": False
    })

# --- Ads Schemas ---
class AdBase(BaseModel):
    slot_id: str
    title: str
    title_i18n: Dict[str, str] = Field(default_factory=dict)
    description: str = ""
    desc_i18n: Dict[str, str] = Field(default_factory=dict)
    link_url: str = ""
    image_url: str = ""
    action_type: str = "link"  # link | wechat | modal
    wechat_id: str = ""
    format: str = "banner"     # banner | square
    is_active: bool = True
    sort_order: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class AdCreate(AdBase):
    pass

class AdUpdate(BaseModel):
    slot_id: Optional[str] = None
    title: Optional[str] = None
    title_i18n: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    desc_i18n: Optional[Dict[str, str]] = None
    link_url: Optional[str] = None
    image_url: Optional[str] = None
    action_type: Optional[str] = None
    wechat_id: Optional[str] = None
    format: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class AdResponse(AdBase):
    id: int
    click_count: int = 0
    close_count: int = 0
    created_at: str
    updated_at: str

# --- Links Schemas ---
class LinkBase(BaseModel):
    category: str = "friend"   # friend | tool
    title: str
    title_i18n: Dict[str, str] = Field(default_factory=dict)
    description: str = ""
    desc_i18n: Dict[str, str] = Field(default_factory=dict)
    url: str
    icon_svg: str = ""
    icon_class: str = ""
    sort_order: int = 0
    is_active: bool = True

class LinkCreate(LinkBase):
    pass

class LinkUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    title_i18n: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    desc_i18n: Optional[Dict[str, str]] = None
    url: Optional[str] = None
    icon_svg: Optional[str] = None
    icon_class: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class LinkResponse(LinkBase):
    id: int
    click_count: int = 0
    created_at: str
    updated_at: str
