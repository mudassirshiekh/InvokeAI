import { Tooltip } from '@chakra-ui/react';
import { Handle, Position } from 'reactflow';
import { FIELDS, OutputField } from '../types';

type OutputHandleProps = {
  nodeId: string;
  field: OutputField;
  top: string;
};

export const OutputHandle = (props: OutputHandleProps) => {
  const { nodeId, field, top } = props;
  const { name, title, type, description } = field;
  return (
    <Tooltip key={name} label={`${title} (${type})`} placement="end" hasArrow>
      <Handle
        type="target"
        id={name}
        position={Position.Right}
        style={{
          position: 'absolute',
          top,
          right: '-0.5rem',
          width: '1rem',
          height: '1rem',
          backgroundColor: `var(--invokeai-colors-${FIELDS[type].color}-500)`,
        }}
      />
    </Tooltip>
  );
};
