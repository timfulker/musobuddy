<FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (£)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="500.00" 
                                {...field} 
                                value={field.value || ""} // Ensure controlled component
                                onChange={(e) => {
                                  console.log("🔍 Amount input change:", e.target.value);
                                  field.onChange(e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />