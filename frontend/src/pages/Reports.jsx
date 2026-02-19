import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSalesReport, getInventoryReport } from '../api/reports'
import './Reports.css'

function Reports() {
  const { storeId } = useParams()
  const [salesReport, setSalesReport] = useState(null)
  const [inventoryReport, setInventoryReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadData()
  }, [storeId, dateRange])

  const loadData = async () => {
    try {
      setLoading(true)
      const [salesData, inventoryData] = await Promise.all([
        getSalesReport(storeId, dateRange.startDate, dateRange.endDate),
        getInventoryReport(storeId)
      ])
      setSalesReport(salesData)
      setInventoryReport(inventoryData)
    } catch (err) {
      console.error('Failed to load reports', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !salesReport || !inventoryReport) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="reports">
      <div className="page-header">
        <Link to="/stores" className="back-link">← 返回门店列表</Link>
      </div>

      <h2>报表分析</h2>

      <div className="report-filters">
        <div className="filter-group">
          <label>开始日期</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>结束日期</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <h3>销售报表</h3>
          <div className="report-content">
            <div className="report-item">
              <span className="report-label">统计期间</span>
              <span className="report-value">
                {salesReport.startDate} 至 {salesReport.endDate}
              </span>
            </div>
            <div className="report-item">
              <span className="report-label">订单数量</span>
              <span className="report-value">{salesReport.orderCount}</span>
            </div>
            <div className="report-item">
              <span className="report-label">总销售额</span>
              <span className="report-value highlight">
                ¥{salesReport.totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="report-item">
              <span className="report-label">平均订单金额</span>
              <span className="report-value">
                ¥{salesReport.avgOrderAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="report-card">
          <h3>库存报表</h3>
          <div className="report-content">
            <div className="report-item">
              <span className="report-label">商品总数</span>
              <span className="report-value">{inventoryReport.totalProducts}</span>
            </div>
            <div className="report-item">
              <span className="report-label">低库存商品</span>
              <span className="report-value warning">
                {inventoryReport.lowStockProducts}
              </span>
            </div>
            <div className="report-item">
              <span className="report-label">缺货商品</span>
              <span className="report-value danger">
                {inventoryReport.outOfStockProducts}
              </span>
            </div>
            <div className="report-item">
              <span className="report-label">库存总价值</span>
              <span className="report-value highlight">
                ¥{inventoryReport.totalValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
