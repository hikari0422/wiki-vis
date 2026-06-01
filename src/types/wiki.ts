import * as d3 from 'd3';

export interface WikiNode extends d3.SimulationNodeDatum {
  id: string;          // Wikipedia page title (e.g., "D3.js"), acts as the unique identifier
  label: string;       // Clean text displayed on the screen
  loaded: boolean;     // Whether its outgoing links have been fetched and plotted
  loading?: boolean;   // Whether the node is currently in a loading state
  url: string;         // Full URL to the Wikipedia page
  isRoot?: boolean;    // Whether this node is the search-initiated entry root
  isDeadEnd?: boolean; // Whether the node has no outgoing mainlinks
  lang: string;        // The language of this specific node (e.g. "zh", "en", "ja")
  depth?: number;      // Hierarchical generation depth (0 = root, 1 = children, 2 = grandchildren...)
  treeX?: number;      // Target X coordinate in Horizontal Tree Layout
  treeY?: number;      // Target Y coordinate in Horizontal Tree Layout
}

export interface WikiLink extends d3.SimulationLinkDatum<WikiNode> {
  source: string | WikiNode;
  target: string | WikiNode;
}
