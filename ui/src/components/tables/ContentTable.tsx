import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { ExtractionGraph, IContentMetadata, IndexifyClient } from 'getindexify'
import {
  Alert,
  Button,
  Chip,
  Tab,
  Tabs,
  TextField,
  Typography,
  IconButton,
} from '@mui/material'
import { Box, Stack } from '@mui/system'
import React, { useEffect, useState } from 'react'
import moment from 'moment'
import { Link } from 'react-router-dom'
import CopyText from '../CopyText'
import { IContentMetadataExtended } from '../../types'
import UploadButton from '../UploadButton'
import { InfoCircle, TableDocument } from 'iconsax-react'
import { splitLabels } from '../../utils/helpers';

const ContentTable = ({
  loadData,
  client,
  contentId,
  extractorName,
  policyName,
  extractionGraphs,
}: {
  contentId: string,
  extractorName: string,
  policyName: string,
  client: IndexifyClient,
  extractionGraphs: ExtractionGraph[],
  loadData: ({
    contentId,
    graphName,
    policyName
  }: {
    contentId: string
    graphName: string
    policyName: string
  }) => Promise<IContentMetadataExtended[]>
}) => {
  const [rowCountState, setRowCountState] = useState(0)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<IContentMetadataExtended[]>([])
  const [startIds, setStartIds] = useState<Record<number, string>>({})
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  })
  const [currentTab, setCurrentTab] = useState<string>('ingested')
  const [searchFilter, setSearchFilter] = useState<{
    contentId: string
    policyName: string
  }>({ contentId: '', policyName: 'Any' })

  useEffect(() => {
    let active = true

    ;(async () => {
      setLoading(true)
      if (!active || !loadData) return

      // load tasks for a given page
      const newContent = await loadData({
        contentId: contentId,
        graphName: extractorName,
        policyName: policyName, 
      })
      setContent(newContent)

      const newRowCount =
        paginationModel.page * paginationModel.pageSize + newContent.length
      setRowCountState(newRowCount)

      // add to startids if needed
      if (newContent.length && startIds[paginationModel.page] === undefined) {
        const lastId = newContent[newContent.length - 1].id
        setStartIds((prev) => ({
          ...prev,
          [paginationModel.page]: lastId,
        }))
      }
      setLoading(false)
    })()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel])

  useEffect(() => {
    goToPage(0)
    if (currentTab === 'search') {
      // const searchPolicy = extractionPolicies.find(
      //   (policy) => policy.name === searchFilter.policyName
      // )
      //TODO search for policy
    } else if (currentTab === undefined) {
      // go back to root node of graph tab
      setGraphTabIds([])
    } else {
      // current tab is now a content id
      // remove tabs after id: selectedValue if possible
      setGraphTabIds((currentIds) => {
        const index = currentIds.indexOf(currentTab)
        const newIds = [...currentIds]
        newIds.splice(index + 1)
        return newIds
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, searchFilter])

  const [graphTabIds, setGraphTabIds] = useState<string[]>([])

  const onClickChildren = (selectedContent: IContentMetadata) => {
    // append id to graphTabIds - this adds a new tab
    setGraphTabIds([...graphTabIds, selectedContent.id])
    setCurrentTab(selectedContent.id)
  }

  const onChangeTab = (event: React.SyntheticEvent, selectedValue: string) => {
    setCurrentTab(selectedValue)
  }

  const goToPage = (page: number) => {
    setPaginationModel((currentModel) => ({
      ...currentModel,
      page,
    }))
  }

  let columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
    flex: 1,
      renderCell: (params) => {
        return (
          <>
            <Link to={`/${params.row.namespace}/content/${params.row.id}`}>
              {params.value}
            </Link>
            <CopyText text={params.value} />
          </>
        )
      },
    },
    {
      field: 'children',
      headerName: 'Children',
      flex: 1,
      renderCell: (params) => {
        const clickable = currentTab !== 'search' && params.value !== 0
        return (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onClickChildren(params.row)
            }}
            sx={{
              pointerEvents: clickable ? 'search' : 'none',
              textDecoration: clickable ? 'underline' : 'none',
            }}
            variant="text"
          >
            <Typography variant="body1">{params.value}</Typography>
          </Button>
        )
      },
    },
    {
      field: 'source',
      headerName: 'Source',
      flex: 1,
      valueGetter: (params) => {
        return params.value || 'ingestion'
      },
    },
    {
      field: 'mime_type',
      flex: 1,
      headerName: 'Mime Type',
      renderCell: (params) => {
        return <Chip label={params.value || 'None'} sx={{ backgroundColor: "#E5EFFB" }} />
      }
    },
    {
      field: 'labels',
      headerName: 'Labels',
      flex: 1,
      renderCell: (params) => {
          if (Object.keys(params.value).length === 0 && params.value.constructor === Object) {
              return <Typography variant="caption">None</Typography>;
          }
          return <Typography variant="caption">{splitLabels(params.value)}</Typography>;
      },
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      flex: 1,
      valueGetter: (params) => {
        return moment(params.value * 1000).format('MM/DD/YYYY h:mm A')
      },
    },
  ]

  columns = columns.filter((col) => {
    if (
      currentTab === undefined &&
      (col.field === 'source' || col.field === 'parent_id')
    ) {
      return false
    }
    return true
  })

  const renderContent = () => {
    if (content.length === 0) {
      return (
        <Box mt={1} mb={2}>
          <Alert variant="outlined" severity="info">
            No Content Found
          </Alert>
        </Box>
      )
    }

    return (
      <Box sx={{ width: '100%', marginTop: '1rem', }}>
        <DataGrid
          sx={{ backgroundColor: 'white', borderRadius: '0.5rem' }}
          autoHeight
          rows={content.slice(0, paginationModel.pageSize)}
          rowCount={rowCountState}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          loading={loading}
          pageSizeOptions={[5]}
          className="custom-data-grid"
        />
      </Box>
    )
  }

  return (
    <>
      <Stack
        display={'flex'}
        direction={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        spacing={2}
      >
        <div className="content-table-header">
          <div className="heading-icon-container">
            <TableDocument size="25" className="heading-icons" variant="Outline"/>
          </div>
          <Typography variant="h4">
            Content
            <IconButton
              href="https://docs.docs.getindexify.ai/concepts/#content"
              target="_blank"
            >
              <InfoCircle size="20" variant="Outline"/>
            </IconButton>
          </Typography>
        </div>
        <UploadButton client={client} extractionGraphs={extractionGraphs} />
      </Stack>
      <Box justifyContent={'space-between'} display={'flex'}>
        <Tabs
          value={currentTab ?? 'ingested'}
          onChange={onChangeTab}
          aria-label="disabled tabs example"
        >
          {/* <Tab value={'search'} label="Search" /> */}
          <Tab value={'ingested'} label="Ingested" />

          {graphTabIds.map((id, i) => {
            return <Tab key={`filter-${id}`} value={id} label={id} />
          })}
        </Tabs>
        {/* Filter for search tab */}
        {currentTab === 'search' && (
          <Box display="flex" gap={2}>
            {/* Added gap for spacing between elements */}
            <TextField
              onChange={(e) =>
                setSearchFilter({
                  ...searchFilter,
                  contentId: e.target.value,
                })
              }
              value={searchFilter.contentId}
              label="Content Id"
              sx={{ width: 'auto' }} // Adjust width as needed
              size="small"
            />
            {/* <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="demo-select-small-label">
                Extraction Policy
              </InputLabel>
              <Select
                labelId="demo-select-small-label"
                id="demo-select-small"
                label="Extraction Policy"
                value={searchFilter.policyName}
                onChange={(e) =>
                  setSearchFilter({
                    ...searchFilter,
                    policyName: e.target.value,
                  })
                }
              >
                <MenuItem value="Any">Any</MenuItem>
                {extractionPolicies.map((policy) => (
                  <MenuItem key={policy.name} value={policy.name}>
                    {policy.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl> */}
          </Box>
        )}
      </Box>
      {renderContent()}
    </>
  )
}

export default ContentTable
