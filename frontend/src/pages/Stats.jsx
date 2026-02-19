import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getDashboardStats, getSalesTrend, getTopProducts } from '../api/stats'
import './Stats.css'

function Stats() {
  const { storeId } = useParams()
  const [stats, setStats] = useState(null)
  const [trend, setTrend] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [storeId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsData, trendData, topProductsData] = await Promise.all([
        getDashboardStats(storeId),
        getSalesTrend(storeId, 7),
        getTopProducts(storeId, 7, 10)
      ])
      setStats(statsData)
      setTrend(trendData)
      setTopProducts(topProductsData)
    } catch (err) {
      console.error('Failed to load stats', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="stats">
      <div className="page-header">
        <Link to="/stores" className="back-link">← 返回门店列表</Link>
      </div>

      <h2>数据统计</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>商品总数</h3>
          <p className="stat-value">{stats.totalProducts}</p>
        </div>
        <div className="stat-card">
          <h3>低库存商品</h3>
          <p className="stat-value warning">{stats.lowStockCount}</p>
        </div>
        <div className="stat-card">
          <h3>今日销售额</h3>
          <p className="stat-value">¥{stats.todaySales.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>本周销售额</h3>
          <p className="stat-value">¥{stats.weekSales.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>本月销售额</h3>
          <p className="stat-value">¥{stats.monthSales.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>近期订单数</h3>
          <p className="stat-value">{stats.recentOrdersCount}</p>
        </div>
      </div>

      <div className="stats-charts">
        <div className="chart-card">
          <h3>销售趋势（近7天）</h3>
          <div className="trend-chart">
            {trend.map((item, index) => (
              <div key={index} className="trend-bar">
                <div className="trend-bar-fill" style={{ 
                  height: `${Math.max(5, (item.amount / Math.max(...trend.map(t => t.amount), 1)) * 100)}%` 
                }}></div>
                <span className="trend-label">¥{item.amount.toFixed(0)}</span>
                <span className="trend-date">{item.date.substring(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>热销商品（近7天）</h3>
          <table className="top-products-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>商品名称</th>
                <th>销售数量</th>
                <th>销售金额</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => (
                <tr key={product.productId}>
                  <td>{index + 1}</td>
                  <td>{product.productName}</td>
                  <td>{product.quantity.toFixed(2)}</td>
                  <td>¥{product.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Stats
