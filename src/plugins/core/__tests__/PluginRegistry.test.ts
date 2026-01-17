// src/plugins/core/__tests__/PluginRegistry.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PluginRegistry } from "../PluginRegistry";
import { VisualizationPlugin, PluginDataRequirement } from "@/types/plugin";

// Mock plugin for testing
class MockPlugin implements VisualizationPlugin {
  metadata = {
    id: "mock-plugin",
    name: "Mock Plugin",
    description: "Test plugin",
    version: "1.0.0",
    priority: 1,
    dataRequirements: [
      {
        dataset: "temporal_monthly",
        required: true,
      },
      {
        dataset: "file_index",
        required: false,
        alias: "files",
      },
    ] as PluginDataRequirement[],
  };

  defaultConfig = { width: 800, height: 600 };

  init = vi.fn();
  processData = vi.fn();
  render = vi.fn();
  update = vi.fn();
  destroy = vi.fn();
  exportImage = vi.fn();
  exportData = vi.fn();
}

// Plugin with no data requirements
class LegacyPlugin implements VisualizationPlugin {
  metadata = {
    id: "legacy-plugin",
    name: "Legacy Plugin",
    description: "Plugin without data requirements",
    version: "1.0.0",
    priority: 2,
  };

  defaultConfig = {};

  init = vi.fn();
  processData = vi.fn();
  render = vi.fn();
  update = vi.fn();
  destroy = vi.fn();
  exportImage = vi.fn();
  exportData = vi.fn();
}

// Plugin with invalid dataset
class InvalidPlugin implements VisualizationPlugin {
  metadata = {
    id: "invalid-plugin",
    name: "Invalid Plugin",
    description: "Plugin with missing dataset",
    version: "1.0.0",
    priority: 3,
    dataRequirements: [
      {
        dataset: "nonexistent_dataset",
        required: true,
      },
    ] as PluginDataRequirement[],
  };

  defaultConfig = {};

  init = vi.fn();
  processData = vi.fn();
  render = vi.fn();
  update = vi.fn();
  destroy = vi.fn();
  exportImage = vi.fn();
  exportData = vi.fn();
}

describe("PluginRegistry - Enhanced Data Requirements", () => {
  beforeEach(() => {
    PluginRegistry.clear();
  });

  describe("getDataRequirements", () => {
    it("should return data requirements for a registered plugin", () => {
      const plugin = new MockPlugin();
      PluginRegistry.register(plugin);

      const requirements = PluginRegistry.getDataRequirements("mock-plugin");

      expect(requirements).toHaveLength(2);
      expect(requirements[0].dataset).toBe("temporal_monthly");
      expect(requirements[0].required).toBe(true);
      expect(requirements[1].dataset).toBe("file_index");
      expect(requirements[1].required).toBe(false);
    });

    it("should return empty array for plugin without requirements", () => {
      const plugin = new LegacyPlugin();
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
      const plugin = new MockPlugin();
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
      const plugin = new InvalidPlugin();
      PluginRegistry.register(plugin);

      const validation =
        await PluginRegistry.validateDataAvailability("invalid-plugin");

      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain("nonexistent_dataset");
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain("not found in registry");
    });

    it("should mark plugin as valid if only optional datasets are missing", async () => {
      // Create plugin with only optional missing dataset
      class OptionalMissingPlugin implements VisualizationPlugin {
        metadata = {
          id: "optional-missing",
          name: "Optional Missing",
          description: "Test",
          version: "1.0.0",
          priority: 1,
          dataRequirements: [
            {
              dataset: "temporal_monthly",
              required: true,
            },
            {
              dataset: "nonexistent_optional",
              required: false,
            },
          ] as PluginDataRequirement[],
        };

        defaultConfig = {};
        init = vi.fn();
        processData = vi.fn();
        render = vi.fn();
        update = vi.fn();
        destroy = vi.fn();
        exportImage = vi.fn();
        exportData = vi.fn();
      }

      const plugin = new OptionalMissingPlugin();
      PluginRegistry.register(plugin);

      const validation =
        await PluginRegistry.validateDataAvailability("optional-missing");

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0]).toContain("nonexistent_optional");
    });

    it("should handle plugin without data requirements", async () => {
      const plugin = new LegacyPlugin();
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
      const plugin1 = new MockPlugin();
      const plugin2 = new LegacyPlugin();

      PluginRegistry.register(plugin1);
      PluginRegistry.register(plugin2);

      const plugins = PluginRegistry.getPluginsByDataset("temporal_monthly");

      expect(plugins).toHaveLength(1);
      expect(plugins[0].metadata.id).toBe("mock-plugin");
    });

    it("should return empty array if no plugins use the dataset", () => {
      const plugin = new LegacyPlugin();
      PluginRegistry.register(plugin);

      const plugins = PluginRegistry.getPluginsByDataset("temporal_monthly");

      expect(plugins).toEqual([]);
    });

    it("should find plugins using optional datasets", () => {
      const plugin = new MockPlugin();
      PluginRegistry.register(plugin);

      const plugins = PluginRegistry.getPluginsByDataset("file_index");

      expect(plugins).toHaveLength(1);
      expect(plugins[0].metadata.id).toBe("mock-plugin");
    });
  });

  describe("getDataRequirementsSummary", () => {
    it("should provide summary of all data requirements", () => {
      const plugin1 = new MockPlugin();
      const plugin2 = new LegacyPlugin();

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
      // Create two plugins that both use temporal_monthly
      class Plugin1 implements VisualizationPlugin {
        metadata = {
          id: "plugin-1",
          name: "Plugin 1",
          description: "Test",
          version: "1.0.0",
          priority: 1,
          dataRequirements: [
            { dataset: "temporal_monthly", required: true },
          ] as PluginDataRequirement[],
        };
        defaultConfig = {};
        init = vi.fn();
        processData = vi.fn();
        render = vi.fn();
        update = vi.fn();
        destroy = vi.fn();
        exportImage = vi.fn();
        exportData = vi.fn();
      }

      class Plugin2 implements VisualizationPlugin {
        metadata = {
          id: "plugin-2",
          name: "Plugin 2",
          description: "Test",
          version: "1.0.0",
          priority: 2,
          dataRequirements: [
            { dataset: "temporal_monthly", required: false },
          ] as PluginDataRequirement[],
        };
        defaultConfig = {};
        init = vi.fn();
        processData = vi.fn();
        render = vi.fn();
        update = vi.fn();
        destroy = vi.fn();
        exportImage = vi.fn();
        exportData = vi.fn();
      }

      PluginRegistry.register(new Plugin1());
      PluginRegistry.register(new Plugin2());

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
      const plugin1 = new MockPlugin();
      const plugin2 = new LegacyPlugin();
      const plugin3 = new InvalidPlugin();

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
      const plugin = new LegacyPlugin();

      expect(() => PluginRegistry.register(plugin)).not.toThrow();
      expect(PluginRegistry.has("legacy-plugin")).toBe(true);
      expect(PluginRegistry.getDataRequirements("legacy-plugin")).toEqual([]);
    });

    it("should not break existing plugin methods", () => {
      const plugin = new MockPlugin();
      PluginRegistry.register(plugin);

      const retrieved = PluginRegistry.get("mock-plugin");

      expect(retrieved).toBeDefined();
      expect(retrieved?.metadata.id).toBe("mock-plugin");
      expect(retrieved?.defaultConfig).toBeDefined();
    });
  });
});
