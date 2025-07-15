export default function Settings() {
  const { toast } = useToast();
  
  // ✅ MOVE ALL STATE DECLARATIONS TO THE TOP
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    sortCode: "",
    accountNumber: ""
  });
  
  // State for tag management
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [gigTypes, setGigTypes] = useState<string[]>([]);
  const [newEventType, setNewEventType] = useState("");
  const [newGigType, setNewGigType] = useState("");
  
  // State for instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  
  // ✅ NOW THIS useEffect CAN SAFELY REFERENCE ALL STATE VARIABLES
  React.useEffect(() => {
    console.log("Settings page loaded");
    console.log("Current URL:", window.location.href);
    console.log("Document cookies:", document.cookie);
    console.log("hasInitialized state:", hasInitialized);
    console.log("All state variables defined:", {
      sidebarOpen,
      hasInitialized,
      eventTypes,        // ✅ Now defined above
      gigTypes,          // ✅ Now defined above  
      selectedInstruments, // ✅ Now defined above
      customInstruments    // ✅ Now defined above
    });
  }, []);
  
  // Define instrument categories AFTER state but BEFORE queries
  const instrumentCategories = {
    "Band / Pop / Function": ["saxophone", "guitar", "piano", "vocals", "bass", "drums", "dj", "keyboard", "synth", "singer-songwriter"],
    "Classical / Traditional": ["violin", "viola", "cello", "flute", "clarinet", "oboe", "harp"],
    "Brass / Jazz / Marching": ["trumpet", "trombone", "percussion"]
  };

  // ✅ NOW QUERIES AND FORMS CAN BE DECLARED
  const { data: settings = {}, isLoading, error } = useQuery({
    queryKey: ["/api/settings"],
    retry: 1,
    onError: (error) => {
      console.error("Settings query error:", error);
    },
    onSuccess: (data) => {
      console.log("Settings query success:", data);
    }
  });

  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: "",
      businessEmail: "",
      businessAddress: "",
      phone: "",
      website: "",
      taxNumber: "",
      bankDetails: "",
      defaultTerms: "",
      emailFromName: "",
      nextInvoiceNumber: 256,
      gigTypes: "",
      eventTypes: "",
      instrumentsPlayed: "",
      customInstruments: "",
    },
  });

  // ... rest of component stays the same
}