interface ComponentRegistryEntry {
    componentClass: any;
    tagName: string;
    description?: string;
    dependencies?: string[];
}
declare const COMPONENT_REGISTRY: Record<string, ComponentRegistryEntry>;
declare class ComponentRegistry {
    private registeredComponents;
    private registrationLog;
    registerComponent(tagName: string, componentClass: any, force?: boolean): boolean;
    unregisterComponent(tagName: string): boolean;
    registerComponents(entries?: Array<ComponentRegistryEntry | string>, options?: {
        force?: boolean;
        silent?: boolean;
    }): boolean;
    getComponentStatus(tagName: string): {
        registered: boolean;
        registryEntry?: ComponentRegistryEntry;
        lastRegistration?: typeof this.registrationLog[0];
    };
    getRegisteredComponents(): string[];
    getAvailableComponents(): string[];
    getRegistrationLog(limit?: number): typeof this.registrationLog;
    validateRegistry(): {
        valid: boolean;
        missing: string[];
        circular: string[];
    };
}
export declare function registerAllComponents(options?: {
    force?: boolean;
}): boolean;
export declare function registerComponent(tagName: string, force?: boolean): boolean;
export declare function getComponentRegistry(): ComponentRegistry;
export declare function registerConditionalComponents(components: string[]): boolean;
export type { ComponentRegistryEntry };
export { COMPONENT_REGISTRY };
export { ComponentRegistry };
//# sourceMappingURL=registry.d.ts.map