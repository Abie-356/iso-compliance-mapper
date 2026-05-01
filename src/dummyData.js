export const dummyGraphData = {
  nodes: [
    // The "Standard" Nodes (ISO Controls)
    { id: 'ISO_5_1', name: '5.1 Policies for info security', group: 1 },
    { id: 'ISO_5_2', name: '5.2 Info security roles', group: 1 },
    { id: 'ISO_8_1', name: '8.1 User endpoint devices', group: 1 },
    { id: 'ISO_8_2', name: '8.2 Privileged access rights', group: 1 },
    { id: 'ISO_8_3', name: '8.3 Info access restriction', group: 1 }, // We will leave this one unmapped!
    
    // The "Company Policy" Nodes (What you uploaded)
    { id: 'POL_1', name: 'Information Security Policy.pdf', group: 2 },
    { id: 'POL_2', name: 'Access Control Policy.pdf', group: 2 },
    { id: 'POL_3', name: 'BYOD Policy.pdf', group: 2 },
  ],
  links: [
    // Connecting Policies to the Standards they satisfy
    { source: 'POL_1', target: 'ISO_5_1', label: 'SATISFIES' },
    { source: 'POL_1', target: 'ISO_5_2', label: 'SATISFIES' },
    { source: 'POL_2', target: 'ISO_8_2', label: 'SATISFIES' },
    { source: 'POL_3', target: 'ISO_8_1', label: 'SATISFIES' },
    // Notice nothing is targeting ISO_8_3. That is our "Gap"!
  ]
};