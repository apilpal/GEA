"""
Continue IDE Tutorial and Example Code.

This module serves as an interactive tutorial for learning how to use Continue.dev,
an AI-powered coding assistant. It demonstrates various IDE features including
autocomplete, edit functionality, chat interactions, and agent capabilities.

The tutorial includes:
- Autocomplete demonstrations with code suggestions
- Edit mode examples for code refactoring
- Chat mode examples for code analysis
- Agent mode examples for project management

This file is part of the school management system backend and provides
educational content for developers learning to use AI-assisted development tools.
"""

"""
                    _________               _____ _____
                       __  ____/______ _______ __  /____(_)_______ ____  _______
                       _  /     _  __ \__  __ \_  __/__  / __  __ \_  / / /_  _ \
                       / /___   / /_/ /_  / / // /_  _  /  _  / / // /_/ / /  __/
                       \____/   \____/ /_/ /_/ \__/  /_/   /_/ /_/ \__,_/  \___/

                                 Autocomplete, Edit, Chat, and Agent tutorial
"""
"""                    _________               _____ _____
                       __  ____/______ _______ __  /____(_)_______ ____  _______
                       _  /     _  __ \__  __ \_  __/__  / __  __ \_  / / /_  _ \
                       / /___   / /_/ /_  / / // /_  _  /  _  / / // /_/ / /  __/
                       \____/   \____/ /_/ /_/ \__/  /_/   /_/ /_/ \__,_/  \___/

                                 Autocomplete, Edit, Chat, and Agent tutorial
"""


def sorting_algorithm(x):
    """Demonstrate bubble sort algorithm for the Continue tutorial.

    This function implements the bubble sort algorithm, which repeatedly
    steps through the list, compares adjacent elements and swaps them if
    they are in the wrong order. The pass through the list is repeated
    until the list is sorted.

    Args:
        x (list): List of comparable elements to be sorted in-place

    Returns:
        list: The same list object, now sorted in ascending order

    Note:
        This is an educational example for learning Continue.dev features.
        Bubble sort is O(n²) and not suitable for large datasets.
    """
    for i in range(len(x)):
        for j in range(len(x) - 1):
            if x[j] > x[j + 1]:
                x[j], x[j + 1] = x[j + 1], x[j]
    return x

def sorting_algorithm2(x):
    """Alternative implementation of bubble sort for comparison.

    This is another version of the bubble sort algorithm, identical to
    sorting_algorithm() above. Used in tutorials to demonstrate different
    Continue.dev features like Chat mode for code analysis.

    Args:
        x (list): List of elements to sort in-place

    Returns:
        list: Sorted list in ascending order

    Example:
        >>> sorting_algorithm2([3, 1, 4, 1, 5])
        [1, 1, 3, 4, 5]
    """
    for i in range(len(x)):
        for j in range(len(x) - 1):
            if x[j] > x[j + 1]:
                x[j], x[j + 1] = x[j + 1], x[j]
    return x

# —————————————————————————————————————————————————     Agent      ————————————————————————————————————————————————— #
#           Agent equips the Chat model with the tools needed to handle a wide range of coding tasks, allowing
#           the model to make decisions and save you the work of manually finding context and performing actions.

# 1. Switch from "Chat" to "Agent" mode using the dropdown in the bottom left of the input box
# 2. Use the "/init" slash command to generate a CONTINUE.md file

# ——————————————————      Learn more at https://docs.continue.dev/getting-started/overview      ——————————————————— #