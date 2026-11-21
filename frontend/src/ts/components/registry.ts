/**
 * Unified Component Registry System
 * Centralizes custom element registration and provides utilities for component management
 */

// Import all components that need registration
import { ChartComponent } from './charts/index';
import { StudentTable, StudentProfileCard } from './students/index';
import { DriverInfo } from './drivers/index';
import { LoginComponent } from './auth/login-component';

/**
 * Registry configuration for all custom elements
 * Maps element names to their component classes and metadata
 */
interface ComponentRegistryEntry {
  componentClass: any;
  tagName: string;
  description?: string;
  dependencies?: string[];
}

/**
 * Central registry of all custom elements in the application
 */
const COMPONENT_REGISTRY: Record<string, ComponentRegistryEntry> = {
  'chart-component': {
    componentClass: ChartComponent,
    tagName: 'chart-component',
    description: 'Interactive chart component supporting bar and pie chart types',
    dependencies: []
  },
  'student-table': {
    componentClass: StudentTable,
    tagName: 'student-table',
    description: 'Data table component for displaying student information',
    dependencies: []
  },
  'student-profile-card': {
    componentClass: StudentProfileCard,
    tagName: 'student-profile-card',
    description: 'Card component for displaying individual student profiles',
    dependencies: []
  },
  'driver-info': {
    componentClass: DriverInfo,
    tagName: 'driver-info',
    description: 'Component for displaying driver information and routes',
    dependencies: []
  },
  'login-component': {
    componentClass: LoginComponent,
    tagName: 'login-component',
    description: 'Authentication component for user login and registration',
    dependencies: []
  }
};

/**
 * Registry of components that should be auto-registered on import
 * Includes all components for consistent unified registration
 */
const AUTO_REGISTER_COMPONENTS = [
   'chart-component',
   'student-table',
   'student-profile-card',
   'driver-info',
   'login-component'
];

/**
 * Component Registry Class
 * Provides methods for registering, unregistering, and managing custom elements
 */
class ComponentRegistry {
  private registeredComponents: Set<string> = new Set();
  private registrationLog: Array<{ tagName: string; timestamp: string; success: boolean; error?: string }> = [];

  /**
   * Registers a single component
   * @param tagName - The custom element tag name
   * @param componentClass - The component class to register
   * @param force - Whether to force re-registration (removes existing if present)
   * @returns boolean indicating success
   */
  registerComponent(tagName: string, componentClass: any, force: boolean = false): boolean {
    try {
      // Check if already registered and not forcing
      if (this.registeredComponents.has(tagName) && !force) {
        console.warn(`Component ${tagName} is already registered. Use force=true to re-register.`);
        return false;
      }

      // Unregister if forcing and already exists
      if (force && this.registeredComponents.has(tagName)) {
        this.unregisterComponent(tagName);
      }

      // Register the component
      customElements.define(tagName, componentClass);
      this.registeredComponents.add(tagName);

      // Log successful registration
      this.registrationLog.push({
        tagName,
        timestamp: new Date().toISOString(),
        success: true
      });

      console.log(`✅ Successfully registered component: ${tagName}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed registration
      this.registrationLog.push({
        tagName,
        timestamp: new Date().toISOString(),
        success: false,
        error: errorMessage
      });

      console.error(`❌ Failed to register component ${tagName}:`, error);
      return false;
    }
  }

  /**
   * Unregisters a component if it exists
   * @param tagName - The custom element tag name to unregister
   * @returns boolean indicating success
   */
  unregisterComponent(tagName: string): boolean {
    try {
      // Note: Custom elements cannot actually be unregistered in most browsers
      // This is more of a cleanup for our internal tracking
      if (this.registeredComponents.has(tagName)) {
        this.registeredComponents.delete(tagName);

        // Log unregistration
        this.registrationLog.push({
          tagName,
          timestamp: new Date().toISOString(),
          success: true
        });

        console.log(`🗑️ Unregistered component tracking: ${tagName}`);
      }
      return true;
    } catch (error) {
      console.error(`❌ Failed to unregister component ${tagName}:`, error);
      return false;
    }
  }

  /**
   * Registers multiple components at once
   * @param entries - Array of component registry entries or tag names
   * @param options - Registration options
   */
  registerComponents(
    entries: Array<ComponentRegistryEntry | string> = AUTO_REGISTER_COMPONENTS,
    options: { force?: boolean; silent?: boolean } = {}
  ): boolean {
    let allSuccessful = true;

    for (const entry of entries) {
      const tagName = typeof entry === 'string' ? entry : entry.tagName;
      const registryEntry = typeof entry === 'string' ? COMPONENT_REGISTRY[entry] : entry;

      if (!registryEntry) {
        if (!options.silent) {
          console.warn(`⚠️ No registry entry found for: ${tagName}`);
        }
        allSuccessful = false;
        continue;
      }

      const success = this.registerComponent(tagName, registryEntry.componentClass, options.force);
      if (!success) {
        allSuccessful = false;
      }
    }

    if (!options.silent) {
      console.log(`📋 Component registration complete. Success: ${allSuccessful}`);
    }

    return allSuccessful;
  }

  /**
   * Gets registration status for a component
   * @param tagName - The custom element tag name
   * @returns Object with registration information
   */
  getComponentStatus(tagName: string): {
    registered: boolean;
    registryEntry?: ComponentRegistryEntry;
    lastRegistration?: typeof this.registrationLog[0];
  } {
    return {
      registered: this.registeredComponents.has(tagName),
      registryEntry: COMPONENT_REGISTRY[tagName],
      lastRegistration: this.registrationLog
        .filter(log => log.tagName === tagName)
        .pop()
    };
  }

  /**
   * Lists all registered components
   * @returns Array of registered component tag names
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.registeredComponents);
  }

  /**
   * Lists all available components in registry (registered or not)
   * @returns Array of all component tag names in registry
   */
  getAvailableComponents(): string[] {
    return Object.keys(COMPONENT_REGISTRY);
  }

  /**
   * Gets registration log for debugging
   * @param limit - Maximum number of log entries to return
   * @returns Array of registration log entries
   */
  getRegistrationLog(limit?: number): typeof this.registrationLog {
    const log = [...this.registrationLog];
    return limit ? log.slice(-limit) : log;
  }

  /**
   * Validates that all registry dependencies are met
   * @returns Object with validation results
   */
  validateRegistry(): {
    valid: boolean;
    missing: string[];
    circular: string[];
  } {
    const missing: string[] = [];
    const circular: string[] = [];

    // Simple dependency check - in a real implementation, you'd want
    // a proper topological sort to detect circular dependencies

    for (const [tagName, entry] of Object.entries(COMPONENT_REGISTRY)) {
      if (entry.dependencies) {
        for (const dep of entry.dependencies) {
          if (!COMPONENT_REGISTRY[dep]) {
            missing.push(`${tagName} -> ${dep}`);
          }
        }
      }
    }

    return {
      valid: missing.length === 0 && circular.length === 0,
      missing,
      circular
    };
  }
}

// Create singleton instance
const componentRegistry = new ComponentRegistry();

/**
 * Registers all auto-register components
 * This function is called during application initialization
 */
export function registerAllComponents(options?: { force?: boolean }): boolean {
  return componentRegistry.registerComponents(AUTO_REGISTER_COMPONENTS, options);
}

/**
 * Registers a specific component by tag name
 */
export function registerComponent(tagName: string, force?: boolean): boolean {
  const entry = COMPONENT_REGISTRY[tagName];
  if (!entry) {
    console.error(`❌ Component ${tagName} not found in registry`);
    return false;
  }

  return componentRegistry.registerComponent(tagName, entry.componentClass, force);
}

/**
 * Gets the component registry instance for advanced usage
 */
export function getComponentRegistry(): ComponentRegistry {
  return componentRegistry;
}

/**
 * Registers components that are not in the auto-register list
 * Useful for conditional or lazy-loaded components
 */
export function registerConditionalComponents(components: string[]): boolean {
  return componentRegistry.registerComponents(components);
}

// Export types for external usage
export type { ComponentRegistryEntry };
export { COMPONENT_REGISTRY };
export { ComponentRegistry };

// Auto-register components when this module is imported
// This provides the unified registry system while maintaining backward compatibility
if (typeof window !== 'undefined') {
  // Only auto-register in browser environment
  registerAllComponents();
}