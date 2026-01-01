import json
import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel


class TemplateMetadata(BaseModel):
    """Metadata for a project template."""

    id: str
    name: str
    description: str
    category: str = 'general'
    difficulty: str = 'beginner'
    features: list[str] = []
    default: bool = False
    image_url: str | None = None


class TemplateManager:
    """Manages project templates for LumioVibe."""

    def __init__(self, templates_dir: str | None = None):
        if templates_dir:
            self._templates_dir = Path(templates_dir)
        else:
            # Default to /openhands/templates in runtime, or local templates folder
            if os.path.exists('/openhands/templates'):
                self._templates_dir = Path('/openhands/templates')
            else:
                # Development: relative to project root
                project_root = Path(__file__).parent.parent.parent.parent
                self._templates_dir = project_root / 'templates'

        self._templates_cache: dict[str, TemplateMetadata] | None = None

    def _load_templates(self) -> dict[str, TemplateMetadata]:
        """Load all template metadata from templates directory."""
        templates: dict[str, TemplateMetadata] = {}

        if not self._templates_dir.exists():
            return templates

        for item in self._templates_dir.iterdir():
            if not item.is_dir():
                continue

            meta_file = item / 'meta.json'
            if not meta_file.exists():
                continue

            try:
                with open(meta_file) as f:
                    meta_data = json.load(f)

                # Check if image exists
                image_path = item / 'image.png'
                if image_path.exists():
                    meta_data['image_url'] = f'/api/templates/{item.name}/image'

                templates[item.name] = TemplateMetadata(**meta_data)
            except (json.JSONDecodeError, ValueError) as e:
                print(f'Error loading template {item.name}: {e}')
                continue

        return templates

    def get_templates(self) -> list[TemplateMetadata]:
        """Get all available templates."""
        if self._templates_cache is None:
            self._templates_cache = self._load_templates()

        return list(self._templates_cache.values())

    def get_template(self, template_id: str) -> TemplateMetadata | None:
        """Get a specific template by ID."""
        if self._templates_cache is None:
            self._templates_cache = self._load_templates()

        return self._templates_cache.get(template_id)

    def get_default_template(self) -> TemplateMetadata | None:
        """Get the default template."""
        templates = self.get_templates()
        for t in templates:
            if t.default:
                return t
        # If no default, return first one
        return templates[0] if templates else None

    def get_template_path(self, template_id: str) -> Path | None:
        """Get the filesystem path to a template."""
        template = self.get_template(template_id)
        if template is None:
            return None

        path = self._templates_dir / template_id
        return path if path.exists() else None

    def get_template_image_path(self, template_id: str) -> Path | None:
        """Get the path to template's image."""
        template_path = self.get_template_path(template_id)
        if template_path is None:
            return None

        image_path = template_path / 'image.png'
        return image_path if image_path.exists() else None

    def to_dict(self, template: TemplateMetadata) -> dict[str, Any]:
        """Convert template metadata to dictionary."""
        return {
            'id': template.id,
            'name': template.name,
            'description': template.description,
            'category': template.category,
            'difficulty': template.difficulty,
            'features': template.features,
            'default': template.default,
            'image_url': template.image_url,
        }
