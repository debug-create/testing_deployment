from fastapi import HTTPException, status

class CompilerBaseException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)

class ScenarioNotFoundError(CompilerBaseException):
    def __init__(self, scenario_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with ID '{scenario_id}' not found."
        )

class EntityNotFoundError(CompilerBaseException):
    def __init__(self, entity_type: str, entity_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_type} with ID '{entity_id}' not found."
        )

class DuplicateEventError(CompilerBaseException):
    def __init__(self, deduplication_hash: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate security event detected (hash: {deduplication_hash}). Ignored to prevent evidence inflation."
        )

class EventValidationError(CompilerBaseException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Security event validation failed: {detail}"
        )

class IntegrityViolationError(CompilerBaseException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data integrity violation: {detail}"
        )
