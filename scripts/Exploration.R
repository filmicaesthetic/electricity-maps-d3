## uk electricity api

# Load necessary libraries
pacman::p_load(tidyverse, httr, jsonlite)

# get auth token
auth_token <- Sys.getenv("ELECAUTH")

# set api urls
carbon_url <- paste0("https://api.electricitymap.org/v3/carbon-intensity/history?zone=GB")
breakdown_url <- paste0("https://api.electricitymap.org/v3/power-breakdown/history?zone=GB")

# get power breakdown data
response <- GET(breakdown_url, add_headers("auth-token" = auth_token))

# save as dataframe
df <- as.data.frame(data)

# unnest consumption columns
consumption_df <- df |>
  select(history.datetime, history.powerConsumptionBreakdown) |>
  unnest(history.powerConsumptionBreakdown) |>
  mutate(type = "consumption")

# unnest production columns
production_df <- df |>
  select(history.datetime, history.powerProductionBreakdown) |>
  unnest(history.powerProductionBreakdown) |>
  mutate(type = "production")

# combine & reformat into single dataframe
comb_df <- rbind(consumption_df, production_df) |>
  pivot_longer(cols = c("nuclear", "geothermal", "biomass", "coal", "wind", "solar", "hydro", "gas", "oil", "unknown", "hydro discharge", "battery discharge"), names_to = "source", values_to = "power")

