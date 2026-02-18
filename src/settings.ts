import { App, PluginSettingTab, Setting } from 'obsidian';
import { DirectedGraphSettings, DEFAULT_SETTINGS } from './types';
import type DirectedGraphPlugin from './main';

/**
 * Settings tab for the Directed Graph plugin.
 */
export class DirectedGraphSettingTab extends PluginSettingTab {
    plugin: DirectedGraphPlugin;

    constructor(app: App, plugin: DirectedGraphPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Directed Graph Settings' });

        // ------- Visibility -------
        containerEl.createEl('h3', { text: 'Visibility' });

        new Setting(containerEl)
            .setName('Show arrows')
            .setDesc('Display arrowheads on directed edges.')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showArrows)
                    .onChange(async (value) => {
                        this.plugin.settings.showArrows = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        new Setting(containerEl)
            .setName('Show labels')
            .setDesc('Display label text on edges that have labels.')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showLabels)
                    .onChange(async (value) => {
                        this.plugin.settings.showLabels = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        // ------- Filtering -------
        containerEl.createEl('h3', { text: 'Filtering' });

        new Setting(containerEl)
            .setName('Label filter')
            .setDesc(
                'Only show edges whose label contains this text. Leave empty to show all.'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g. manages')
                    .setValue(this.plugin.settings.labelFilter)
                    .onChange(async (value) => {
                        this.plugin.settings.labelFilter = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        // ------- Colors -------
        containerEl.createEl('h3', { text: 'Edge Colors' });

        new Setting(containerEl)
            .setName('Outgoing arrow color')
            .setDesc('Color for edges pointing from source to target.')
            .addColorPicker((picker) =>
                picker
                    .setValue(this.plugin.settings.outgoingColor)
                    .onChange(async (value) => {
                        this.plugin.settings.outgoingColor = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        new Setting(containerEl)
            .setName('Incoming arrow color')
            .setDesc('Color for edges pointing from target to source.')
            .addColorPicker((picker) =>
                picker
                    .setValue(this.plugin.settings.incomingColor)
                    .onChange(async (value) => {
                        this.plugin.settings.incomingColor = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        new Setting(containerEl)
            .setName('Undirected edge color')
            .setDesc('Color for undirected (labeled) edges.')
            .addColorPicker((picker) =>
                picker
                    .setValue(this.plugin.settings.undirectedColor)
                    .onChange(async (value) => {
                        this.plugin.settings.undirectedColor = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        new Setting(containerEl)
            .setName('Bidirectional arrow color')
            .setDesc('Color for edges with arrows on both ends.')
            .addColorPicker((picker) =>
                picker
                    .setValue(this.plugin.settings.bidirectionalColor)
                    .onChange(async (value) => {
                        this.plugin.settings.bidirectionalColor = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        // ------- Physics -------
        containerEl.createEl('h3', { text: 'Graph Physics' });

        new Setting(containerEl)
            .setName('Link distance')
            .setDesc('Ideal distance between connected nodes.')
            .addSlider((slider) =>
                slider
                    .setLimits(50, 500, 10)
                    .setValue(this.plugin.settings.linkDistance)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.linkDistance = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        new Setting(containerEl)
            .setName('Node repulsion')
            .setDesc('How strongly nodes push away from each other.')
            .addSlider((slider) =>
                slider
                    .setLimits(0, 1000, 50)
                    .setValue(this.plugin.settings.nodeRepulsion)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.nodeRepulsion = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshGraphView();
                    })
            );

        // ------- Reset -------
        new Setting(containerEl)
            .setName('Reset to defaults')
            .setDesc('Restore all settings to their default values.')
            .addButton((button) =>
                button.setButtonText('Reset').onClick(async () => {
                    this.plugin.settings = { ...DEFAULT_SETTINGS };
                    await this.plugin.saveSettings();
                    this.plugin.refreshGraphView();
                    this.display(); // Refresh the settings UI
                })
            );
    }
}
