// src/plugins/core/__tests__/PluginRegistry.test.ts
import { describe, it, expect, beforeEach } from "@/test-utils";
import { PluginRegistry } from "../PluginRegistry";
import {
  createMockPlugin,
  createLegacyPlugin,
  createInvalidPlugin,
  createPluginWithOptionalMissing,
} from "@/test-utils";

describe("PluginRegistry - Enhanced Data Requirements", () => {
  beforeEach(() => {
    PluginRegistry.clear();
  });

  describe("getDataRequirements", () => {
    it("should return data requirements for a registered plugin", () => {
      const plugin = createMockPlugin();
      PluginRegistry.register(plugin);

      const requirements = PluginRegistry.getDataRequirements("mock-plugin");

      expect(requirements).toHaveLength(2);
      expect(requirements[0].dataset).toBe("temporal_monthly");
      expect(requirements[0].required).toBe(true);
      expect(requirements[1].dataset).toBe("file_index");
      expect(requirements[1].required).toBe(false);
    });

    it("should return empty array for plugin without requirements", () => {
      const plugin = createLegacyPlugin();
      PluginRegistry.register(plugin);

      const requirements = PluginRegistry.getDataRequirements("legacy-plugin");

      expect(requirements).toEqual([]);
    });

    it("should return empty array for non-existent plugin", () => {
      const requirements = PluginRegistry.getDataRequirements("non-existent");

      expect(requirements).toEqual([]);
    });
  });

  describe("validateDataAvailability", () => {
    it("should validate plugin with all datasets available", async () => {
      const plugin = createMockPlugin();
      PluginRegistry.register(plugin);

      const validation =
        await PluginRegistry.validateDataAvailability("mock-plugin");

      expect(validation.valid).toBe(true);
      expect(validation.available).toContain("temporal_monthly");
      expect(validation.available).toContain("file_index");
      expect(validation.missing).toEqual([]);
      expect(validation.errors).toEqual([]);
    });

    it("should detect missing required datasets", async () => {
      const plugin = createInvalidPlugin();
      PluginRegistry.register(plugin);

      const validation =
        await PluginRegistry.validateDataAvailability("invalid-plugin");

      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain("nonexistent_dataset");
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain("not found in registry");
    });

    it("should mark plugin as valid if only optional datasets are missing", async () => {
      const plugin = createPluginWithOptionalMissing();
      PluginRegistry.register(plugin);

      const validation =
        await PluginRegistry.validateDataAvailability("optional-missing");

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0]).toContain("nonexistent_optional");
    });

    it("should handle plugin without data requirements", async () => {
      const plugin = createLegacyPlugin();
      PluginRegistry.register(plugin);

      const validation =
        await PluginRegistry.validateDataAvailability("legacy-plugin");

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0]).toContain("no data requirements");
    });

    it("should return error for non-existent plugin", async () => {
      const validation =
        await PluginRegistry.validateDataAvailability("non-existent");

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain("not found in registry");
    });
  });

  describe("getPluginsByDataset", () => {
    it("should return plugins that use a specific dataset", () => {
      const plugin1 = createMockPlugin();
      const plugin2 = createLegacyPlugin();

      PluginRegistry.register(plugin1);
      PluginRegistry.register(plugin2);

      const plugins = PluginRegistry.getPluginsByDataset("temporal_monthly");

      expect(plugins).toHaveLength(1);
      expect(plugins[0].metadata.id).toBe("mock-plugin");
    });

    it("should return empty array if no plugins use the dataset", () => {
      const plugin = createLegacyPlugin();
      PluginRegistry.register(plugin);

      const plugins = PluginRegistry.getPluginsByDataset("temporal_monthly");

      expect(plugins).toEqual([]);
    });

    it("should find plugins using optional datasets", () => {
      const plugin = createMockPlugin();
      PluginRegistry.register(plugin);

      const plugins = PluginRegistry.getPluginsByDataset("file_index");

      expect(plugins).toHaveLength(1);
      expect(plugins[0].metadata.id).toBe("mock-plugin");
    });
  });

  describe("getDataRequirementsSummary", () => {
    it("should provide summary of all data requirements", () => {
      const plugin1 = createMockPlugin();
      const plugin2 = createLegacyPlugin();

      PluginRegistry.register(plugin1);
      PluginRegistry.register(plugin2);

      const summary = PluginRegistry.getDataRequirementsSummary();

      expect(summary.totalPlugins).toBe(2);
      expect(summary.pluginsWithRequirements).toBe(1);
      expect(summary.uniqueDatasets.size).toBe(2);
      expect(summary.requiredDatasets.has("temporal_monthly")).toBe(true);
      expect(summary.optionalDatasets.has("file_index")).toBe(true);
    });

    it("should handle plugins with overlapping requirements", () => {
      const plugin1 = createMockPlugin({
        id: "plugin-1",
        name: "Plugin 1",
        priority: 1,
        dataRequirements: [{ dataset: "temporal_monthly", required: true }],
      });

      const plugin2 = createMockPlugin({
        id: "plugin-2",
        name: "Plugin 2",
        priority: 2,
        dataRequirements: [{ dataset: "temporal_monthly", required: false }],
      });

      PluginRegistry.register(plugin1);
      PluginRegistry.register(plugin2);

      const summary = PluginRegistry.getDataRequirementsSummary();

      expect(summary.totalPlugins).toBe(2);
      expect(summary.pluginsWithRequirements).toBe(2);
      expect(summary.uniqueDatasets.size).toBe(1);
      expect(summary.requiredDatasets.has("temporal_monthly")).toBe(true);
      expect(summary.optionalDatasets.has("temporal_monthly")).toBe(true);
    });
  });

  describe("validateAllPlugins", () => {
    it("should validate all registered plugins", async () => {
      const plugin1 = createMockPlugin();
      const plugin2 = createLegacyPlugin();
      const plugin3 = createInvalidPlugin();

      PluginRegistry.register(plugin1);
      PluginRegistry.register(plugin2);
      PluginRegistry.register(plugin3);

      const results = await PluginRegistry.validateAllPlugins();

      expect(Object.keys(results)).toHaveLength(3);
      expect(results["mock-plugin"].valid).toBe(true);
      expect(results["legacy-plugin"].valid).toBe(true);
      expect(results["invalid-plugin"].valid).toBe(false);
    });

    it("should return empty object when no plugins registered", async () => {
      const results = await PluginRegistry.validateAllPlugins();

      expect(results).toEqual({});
    });
  });

  describe("backward compatibility", () => {
    it("should work with legacy plugins without dataRequirements", () => {
      const plugin = createLegacyPlugin();

      expect(() => PluginRegistry.register(plugin)).not.toThrow();
      expect(PluginRegistry.has("legacy-plugin")).toBe(true);
      expect(PluginRegistry.getDataRequirements("legacy-plugin")).toEqual([]);
    });

    it("should not break existing plugin methods", () => {
      const plugin = createMockPlugin();
      PluginRegistry.register(plugin);

      const retrieved = PluginRegistry.get("mock-plugin");

      expect(retrieved).toBeDefined();
      expect(retrieved?.metadata.id).toBe("mock-plugin");
      expect(retrieved?.defaultConfig).toBeDefined();
    });
  });
});
