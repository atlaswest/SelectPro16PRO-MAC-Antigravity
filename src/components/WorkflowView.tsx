import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, Brain, Filter, Image as ImageIcon, CheckCircle } from 'lucide-react';

// Custom Node Components
const WorkflowNode = ({ data, selected }: NodeProps<any>) => {
  const Icon = data.icon;
  return (
    <div className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 ${selected ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 bg-black/40 backdrop-blur-xl'} min-w-[200px]`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-black" />
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${data.color || 'bg-white/5'}`}>
          <Icon size={16} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{data.category}</span>
          <span className="text-xs font-bold text-white">{data.label}</span>
        </div>
      </div>
      <div className="space-y-1">
        {data.stats && Object.entries(data.stats).map(([key, value]: [string, any]) => (
          <div key={key} className="flex justify-between items-center text-[9px] font-medium">
            <span className="text-white/30 uppercase tracking-tighter">{key}</span>
            <span className="text-white/60 font-mono">{value}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-black" />
    </div>
  );
};

const nodeTypes = {
  workflow: WorkflowNode,
};

interface WorkflowViewProps {
  photos: any[];
  selectionRules: any;
}

export default function WorkflowView({ photos, selectionRules }: WorkflowViewProps) {
  const completedCount = photos.filter(p => p.status === 'completed').length;
  const rejectedCount = photos.filter(p => p.isRejected || p.manualRejected).length;
  const heroCount = photos.filter(p => p.result?.isHeroPotential).length;

  const initialNodes: Node[] = [
    {
      id: 'input',
      type: 'workflow',
      position: { x: 50, y: 150 },
      data: { 
        label: 'Source Assets', 
        category: 'Input',
        icon: ImageIcon,
        color: 'bg-emerald-500/20',
        stats: {
          'Total Files': photos.length,
          'RAW+JPG': photos.filter(p => p.rawFile).length,
          'Sessions': 1
        }
      },
    },
    {
      id: 'ai-engine',
      type: 'workflow',
      position: { x: 350, y: 150 },
      data: { 
        label: 'Gemini Vision 2.5', 
        category: 'Analysis',
        icon: Brain,
        color: 'bg-purple-500/20',
        stats: {
          'Processed': completedCount,
          'Pending': photos.length - completedCount,
          'Avg Latency': '1.2s'
        }
      },
    },
    {
      id: 'selection-logic',
      type: 'workflow',
      position: { x: 650, y: 150 },
      data: { 
        label: 'Heuristic Filter', 
        category: 'Logic',
        icon: Filter,
        color: 'bg-amber-500/20',
        stats: {
          'Min Score': `${selectionRules.minOverallScore}%`,
          'Focus Tol': `${selectionRules.minFocusScore}%`,
          'Ratio': selectionRules.requiredAspectRatio
        }
      },
    },
    {
      id: 'output',
      type: 'workflow',
      position: { x: 950, y: 150 },
      data: { 
        label: 'Final Selection', 
        category: 'Output',
        icon: CheckCircle,
        color: 'bg-blue-500/20',
        stats: {
          'Keepers': photos.length - rejectedCount,
          'Not Selected': rejectedCount,
          'Heros': heroCount
        }
      },
    },
  ];

  const initialEdges: Edge[] = [
    { id: 'e1-2', source: 'input', target: 'ai-engine', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e2-3', source: 'ai-engine', target: 'selection-logic', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e3-4', source: 'selection-logic', target: 'output', animated: true, style: { stroke: '#3b82f6' } },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-full w-full bg-[#0b0b0b] relative overflow-hidden">
      {/* ComfyUI Style Grid Background */}
      <div className="absolute inset-0 opacity-20" style={{ 
        backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
        backgroundSize: '24px 24px' 
      }} />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
      >
        <Background color="#333" gap={20} />
        <Controls />
        <Panel position="top-left" className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 m-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-system-accent rounded-xl flex items-center justify-center shadow-lg shadow-system-accent/20">
              <Activity className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Workflow Engine</h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Node-Based Pipeline Visualization</p>
            </div>
          </div>
        </Panel>
        
        <Panel position="bottom-right" className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 m-4">
          <div className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">ComfyUI Engine v1.0.4</div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
