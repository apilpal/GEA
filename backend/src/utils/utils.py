"""
Utility functions for data validation and normalization in the school management system.

This module provides helper functions for cleaning and validating student data,
particularly when importing from external sources like CSV files. It includes
utilities for mobile number validation, class name normalization, and comprehensive
student data validation.

Key Functions:
- Mobile number validation and normalization
- Class name standardization
- CSV data validation and cleaning
- Data transformation for database storage
"""

import re
from typing import Dict, Any, Optional
from models import Student, ContactInfo, LocationDetails, ClassEnum
import re
from typing import Dict, Any, Optional
from models import Student, ContactInfo, LocationDetails, ClassEnum

VALID_CLASSES = ['L.K.G.', 'U.K.G.', 'P.K.', 'P.G', 'N', '1', '2', '3', '4', '5', '6', '7th', '8', '9', '10']

def validate_and_normalize_mobile(mobile: str) -> Optional[str]:
    """Validate and normalize mobile phone numbers.

    Removes whitespace and validates that the number contains only digits
    and is between 10-12 characters long (typical for mobile numbers).

    Args:
        mobile (str): Raw mobile number string

    Returns:
        Optional[str]: Cleaned mobile number if valid, None if invalid or empty

    Examples:
        >>> validate_and_normalize_mobile("9876543210")
        '9876543210'
        >>> validate_and_normalize_mobile("  987 654 3210  ")
        '9876543210'
        >>> validate_and_normalize_mobile("123")
        None
    """
    if not mobile:
        return None
    mobile_clean = re.sub(r'\s+', '', mobile)
    if mobile_clean and re.match(r'^\d{10,12}$', mobile_clean):
        return mobile_clean
    return None

def normalize_class_name(class_name: str) -> Optional[str]:
    """Normalize class names to a standard format.

    Converts common variations of class names to standardized formats
    used in the school management system.

    Args:
        class_name (str): Raw class name string

    Returns:
        Optional[str]: Normalized class name if valid, None if invalid or empty

    Examples:
        >>> normalize_class_name("LKG")
        'L.K.G.'
        >>> normalize_class_name("ukg")
        'U.K.G.'
        >>> normalize_class_name("7")
        '7th'
        >>> normalize_class_name("InvalidClass")
        None
    """
    if not class_name:
        return None

    # Try to normalize common variations
    normalized = class_name.upper()
    if normalized in ['LKG', 'L.K.G', 'LK.G.']:
        return 'L.K.G.'
    elif normalized in ['UKG', 'U.K.G', 'UK.G.']:
        return 'U.K.G.'
    elif normalized in ['PG', 'P.G']:
        return 'P.G'
    elif normalized in ['7']:
        return '7th'
    elif class_name in VALID_CLASSES:
        return class_name
    return None

def validate_student_data(row: Dict[str, Any]) -> Optional[Student]:
    """Validate and clean student data from a CSV row or similar data source.

    Processes raw data from external sources, validates each field, and creates
    a properly structured Student object with normalized data. Invalid or
    empty records are skipped.

    Args:
        row (Dict[str, Any]): Dictionary containing student data with keys like
                             "Name", "Father's name", "Mobile", "Class", "Address",
                             "Fees", "Route"

    Returns:
        Optional[Student]: Validated Student object if all required data is present
                          and valid, None if validation fails or required data missing

    Note:
        - Name is required and cannot be empty
        - Mobile numbers are validated and normalized
        - Class names are standardized to valid formats
        - Fees are converted to float and stored as string
        - Contact info and location details are automatically populated
        - Invalid records are logged and skipped
    """
    try:
        # Validate and clean name
        name = row.get("Name", "").strip()
        if not name:
            return None  # Skip empty names

        # Validate and clean father's name
        father_name = row.get("Father's name", "").strip()

        # Validate and clean mobile number
        mobile_clean = validate_and_normalize_mobile(row.get("Mobile", ""))

        # Validate class
        class_name = normalize_class_name(row.get("Class", "").strip())

        # Validate and clean address
        address = row.get("Address", "").strip()

        # Validate and clean fees
        fees = row.get("Fees", "").strip()
        if fees:
            try:
                fees_float = float(fees)
                fees = str(int(fees_float))  # Convert to integer string
            except ValueError:
                fees = None  # Invalid fees, set to None

        # Validate route
        route = row.get("Route", "").strip()

        return Student(
            route=route if route else None,
            name=name,
            father_name=father_name if father_name else None,
            mobile=mobile_clean,
            class_=class_name,
            address=address if address else None,
            fees=fees,
            contact_info=ContactInfo(
                primary_mobile=mobile_clean[:10] if mobile_clean else None,
                secondary_mobile=mobile_clean[10:].strip() if mobile_clean and len(mobile_clean) > 10 else None,
                father_contact=father_name if father_name else None
            ),
            location_details=LocationDetails(
                route_number=route if route else None,
                full_address=address if address else None,
                area=address.split(',')[0].strip() if address else None
            )
        )
    except Exception as e:
        print(f"Error validating student data: {e}")
        return None