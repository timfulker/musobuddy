import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ContractMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractText: string;
  fileName: string;
  onSaveTemplate: (template: ContractTemplate) => void;
}

interface ContractTemplate {
  name: string;
  patterns: {
    client_name: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    venue_name: string;
    venue_address: string;
    event_date: string;
    start_time: string;
    end_time: string;
    fee: string;
  };
  instructions: string;
}

export function ContractMappingDialog({ 
  isOpen, 
  onClose, 
  contractText, 
  fileName,
  onSaveTemplate 
}: ContractMappingDialogProps) {
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [mappingField, setMappingField] = useState<string>('');
  const [mappedFields, setMappedFields] = useState<Partial<ContractTemplate['patterns']>>({});
  const [instructions, setInstructions] = useState('');
  
  const fields = [
    { key: 'client_name', label: 'Client Name' },
    { key: 'client_email', label: 'Client Email' },
    { key: 'client_phone', label: 'Client Phone' },
    { key: 'client_address', label: 'Client Address' },
    { key: 'venue_name', label: 'Venue Name' },
    { key: 'venue_address', label: 'Venue Address' },
    { key: 'event_date', label: 'Event Date' },
    { key: 'start_time', label: 'Start Time' },
    { key: 'end_time', label: 'End Time' },
    { key: 'fee', label: 'Performance Fee' },
  ];

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const mapSelectedText = () => {
    if (!mappingField || !selectedText) {
      toast({
        title: "Selection Required",
        description: "Please select text and choose a field to map it to.",
        variant: "destructive",
      });
      return;
    }

    setMappedFields(prev => ({
      ...prev,
      [mappingField]: selectedText
    }));

    toast({
      title: "Field Mapped",
      description: `"${selectedText}" mapped to ${fields.find(f => f.key === mappingField)?.label}`,
    });

    setSelectedText('');
    setMappingField('');
  };

  const removeMappedField = (fieldKey: string) => {
    setMappedFields(prev => {
      const updated = { ...prev };
      delete updated[fieldKey as keyof typeof updated];
      return updated;
    });
  };

  const saveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Template Name Required",
        description: "Please enter a name for this contract template.",
        variant: "destructive",
      });
      return;
    }

    if (Object.keys(mappedFields).length === 0) {
      toast({
        title: "No Fields Mapped",
        description: "Please map at least one field before saving the template.",
        variant: "destructive",
      });
      return;
    }

    const template: ContractTemplate = {
      name: templateName,
      patterns: mappedFields as ContractTemplate['patterns'],
      instructions: instructions || 'User-defined contract template'
    };

    onSaveTemplate(template);
    
    toast({
      title: "Template Saved",
      description: `Contract template "${templateName}" saved successfully!`,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Map Contract Fields - {fileName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Contract Text Panel */}
          <div className="flex flex-col">
            <h3 className="font-semibold mb-2">Contract Text</h3>
            <div className="text-sm text-muted-foreground mb-2">
              Select text in the contract below, then choose which field it represents
            </div>
            <div 
              className="flex-1 p-3 border rounded-md overflow-auto text-sm leading-relaxed cursor-text"
              onMouseUp={handleTextSelection}
              style={{ userSelect: 'text' }}
            >
              {contractText.split('\n').map((line, index) => (
                <div key={index} className="mb-1">
                  {line || <br />}
                </div>
              ))}
            </div>
          </div>

          {/* Mapping Panel */}
          <div className="flex flex-col">
            <h3 className="font-semibold mb-2">Field Mapping</h3>
            
            {/* Template Name */}
            <div className="mb-4">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Musicians Union Contract"
              />
            </div>

            {/* Selected Text & Field Mapping */}
            {selectedText && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <Label>Selected Text:</Label>
                <div className="text-sm font-mono bg-background p-2 rounded border mt-1">
                  "{selectedText}"
                </div>
                
                <div className="mt-2">
                  <Label>Map to Field:</Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={mappingField} onValueChange={setMappingField}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map(field => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={mapSelectedText}>Map</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Mapped Fields */}
            <div className="mb-4">
              <Label>Mapped Fields ({Object.keys(mappedFields).length})</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-auto">
                {Object.entries(mappedFields).map(([fieldKey, value]) => (
                  <div key={fieldKey} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Badge variant="secondary">
                      {fields.find(f => f.key === fieldKey)?.label}
                    </Badge>
                    <span className="text-sm font-mono flex-1 truncate">
                      "{value}"
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => removeMappedField(fieldKey)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-4">
              <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Any special notes about this contract format..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={saveTemplate} className="flex-1">
                Save Template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}