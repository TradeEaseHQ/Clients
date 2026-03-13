"""
LeadSourceAdapter — the interface every lead source must implement.
Swap sources by changing LEAD_SOURCE in config; zero business logic changes needed.
"""
from abc import ABC, abstractmethod
from typing import List

from pipeline.models import BusinessRaw


class LeadSourceAdapter(ABC):
    @abstractmethod
    def fetch(self, query: str, city: str, state: str, limit: int) -> List[BusinessRaw]:
        """
        Fetch raw business listings for a given query/location.
        Returns a list of standardized BusinessRaw objects.
        Implementations must handle their own errors gracefully — never raise.
        """
        pass
