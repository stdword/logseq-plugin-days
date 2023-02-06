[中文](README.md) | English

# logseq-plugin-days

Generate a calendar with all days related to a topic highlighted. A topic is either a page or a block.

## Feature Highlights

- Highlight those days that have references to the page or block
- Indicate those days that have journal content
- Jump to the previous/next month with references to the page or block
- Clicking on a day with reference will take you to that day and block
- Clicking on any day will jump to that day's journal page
- You can configure color and repetition for special properties whose value is dates, these dates will be displayed on the calendar on their own rows
- i18n is supported, Chinese Simplified and English are builtin for now, PR is welcomed
- The week's start day follows Logseq's settings, feel free to configure it in Logseq
- Support custom queries that return journal pages as the result

## Usage

https://user-images.githubusercontent.com/3410293/198977267-2e51bc38-bb6f-4546-b50a-86358352975d.mp4

https://user-images.githubusercontent.com/3410293/198977388-af5e7e1c-9fba-4ccb-8227-f3af7ab95b7a.mp4

https://user-images.githubusercontent.com/3410293/199194795-d54b5153-76bb-4313-9b87-2c3e34537ac0.mp4

## Examples

```
Generate an event calendar for a specific page or block with special property dates related to it.
{{renderer :days, [[page]]}}
{{renderer :days, ((block ref))}}

Same as above, but shows all special property dates.
{{renderer :days, [[page]], all}}
{{renderer :days, ((block ref)), all}}

Generate an event calendar for the main page with all special property dates and display days with a journal content.
{{renderer :days, *}}

Custom query. Result must be journal pages. The query statements must be placed in the first sub block as a code block. `all` means to include all the special properties.
{{renderer :days, @}}
{{renderer :days, @, all}}

Generate a topicless calendar with all special property dates.
{{renderer :days}}
```

## Template for an advanced query that returns journal pages

```clojure
[:find (pull ?j [*])
 :where
 [?t :block/name "Tip"]
 [?b :block/refs ?t]
 [?b :block/page ?j]
 [?j :block/journal? true]]
```