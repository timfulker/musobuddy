<FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Client name" 
                              {...field} 
                              value={field.value || ""} // Ensure controlled component
                              onChange={(e) => {
                                console.log("🔍 Client name input change:", e.target.value);
                                field.onChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />