import { ChartComponent } from './charts/index';
import { StudentTable, StudentProfileCard } from './students/index';
import { DriverInfo } from './drivers/index';
import { LoginComponent } from './auth/login-component';
const COMPONENT_REGISTRY = {
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
const AUTO_REGISTER_COMPONENTS = [
    'chart-component',
    'student-table',
    'student-profile-card',
    'driver-info',
    'login-component'
];
class ComponentRegistry {
    constructor() {
        this.registeredComponents = new Set();
        this.registrationLog = [];
    }
    registerComponent(tagName, componentClass, force = false) {
        try {
            if (this.registeredComponents.has(tagName) && !force) {
                console.warn(`Component ${tagName} is already registered. Use force=true to re-register.`);
                return false;
            }
            if (force && this.registeredComponents.has(tagName)) {
                this.unregisterComponent(tagName);
            }
            customElements.define(tagName, componentClass);
            this.registeredComponents.add(tagName);
            this.registrationLog.push({
                tagName,
                timestamp: new Date().toISOString(),
                success: true
            });
            console.log(`✅ Successfully registered component: ${tagName}`);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    unregisterComponent(tagName) {
        try {
            if (this.registeredComponents.has(tagName)) {
                this.registeredComponents.delete(tagName);
                this.registrationLog.push({
                    tagName,
                    timestamp: new Date().toISOString(),
                    success: true
                });
                console.log(`🗑️ Unregistered component tracking: ${tagName}`);
            }
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to unregister component ${tagName}:`, error);
            return false;
        }
    }
    registerComponents(entries = AUTO_REGISTER_COMPONENTS, options = {}) {
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
    getComponentStatus(tagName) {
        return {
            registered: this.registeredComponents.has(tagName),
            registryEntry: COMPONENT_REGISTRY[tagName],
            lastRegistration: this.registrationLog
                .filter(log => log.tagName === tagName)
                .pop()
        };
    }
    getRegisteredComponents() {
        return Array.from(this.registeredComponents);
    }
    getAvailableComponents() {
        return Object.keys(COMPONENT_REGISTRY);
    }
    getRegistrationLog(limit) {
        const log = [...this.registrationLog];
        return limit ? log.slice(-limit) : log;
    }
    validateRegistry() {
        const missing = [];
        const circular = [];
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
const componentRegistry = new ComponentRegistry();
export function registerAllComponents(options) {
    return componentRegistry.registerComponents(AUTO_REGISTER_COMPONENTS, options);
}
export function registerComponent(tagName, force) {
    const entry = COMPONENT_REGISTRY[tagName];
    if (!entry) {
        console.error(`❌ Component ${tagName} not found in registry`);
        return false;
    }
    return componentRegistry.registerComponent(tagName, entry.componentClass, force);
}
export function getComponentRegistry() {
    return componentRegistry;
}
export function registerConditionalComponents(components) {
    return componentRegistry.registerComponents(components);
}
export { COMPONENT_REGISTRY };
export { ComponentRegistry };
if (typeof window !== 'undefined') {
    registerAllComponents();
}
//# sourceMappingURL=registry.js.map