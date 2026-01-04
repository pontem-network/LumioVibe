from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from openhands.server.services.template_manager import TemplateManager

router = APIRouter(prefix='/api/templates', tags=['templates'])

_template_manager: TemplateManager | None = None


def get_template_manager() -> TemplateManager:
    global _template_manager
    if _template_manager is None:
        _template_manager = TemplateManager()
    return _template_manager


@router.get('')
async def list_templates():
    """List all available project templates."""
    manager = get_template_manager()
    templates = manager.get_templates()
    return {
        'templates': [manager.to_dict(t) for t in templates],
    }


@router.get('/default')
async def get_default_template():
    """Get the default template."""
    manager = get_template_manager()
    template = manager.get_default_template()
    if template is None:
        raise HTTPException(status_code=404, detail='No default template found')
    return manager.to_dict(template)


@router.get('/{template_id}')
async def get_template(template_id: str):
    """Get a specific template by ID."""
    manager = get_template_manager()
    template = manager.get_template(template_id)
    if template is None:
        raise HTTPException(status_code=404, detail=f'Template {template_id} not found')
    return manager.to_dict(template)


@router.get('/{template_id}/image')
async def get_template_image(template_id: str):
    """Get template preview image."""
    manager = get_template_manager()
    image_path = manager.get_template_image_path(template_id)
    if image_path is None:
        raise HTTPException(status_code=404, detail='Template image not found')
    return FileResponse(image_path, media_type='image/png')
